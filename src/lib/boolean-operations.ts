import { type Shape, PolygonShape } from './types';
import { nanoid } from 'nanoid';
import type { Clipper2ZFactoryFunction, MainModule } from 'clipper2-wasm/dist/umd/clipper2z';

import * as _Clipper2ZFactory from 'clipper2-wasm/dist/umd/clipper2z';

const Clipper2ZFactory: Clipper2ZFactoryFunction = (_Clipper2ZFactory as any).default || _Clipper2ZFactory;

let wasmModulePromise: Promise<MainModule> | null = null;

function initializeWasm(): Promise<MainModule> {
    if (typeof window === 'undefined') {
        return Promise.reject(new Error("WASM module can only be loaded in the browser."));
    }
    if (wasmModulePromise) {
        return wasmModulePromise;
    }
    wasmModulePromise = new Promise((resolve, reject) => {
        Clipper2ZFactory({
            locateFile: () => '/clipper2z.wasm', // The actual WASM file in /public
        }).then(resolve).catch(reject);
    });
    return wasmModulePromise;
}


/**
 * Converts a shape into an array of world-space points, flattened for the WASM module.
 * @param shape - The shape to convert.
 * @returns A flat array of numbers: [x1, y1, x2, y2, ...].
 */
function shapeToPoints(shape: Shape): number[] {
    const points: { x: number, y: number }[] = [];
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;

    const addPoint = (x: number, y: number) => {
        const angleRad = shape.rotation * (Math.PI / 180);
        if (angleRad === 0) {
            points.push({ x, y });
            return;
        }
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        const rotatedX = (x - cx) * cos - (y - cy) * sin + cx;
        const rotatedY = (x - cx) * sin + (y - cy) * cos + cy;
        points.push({ x: rotatedX, y: rotatedY });
    };

    switch (shape.type) {
        case 'rectangle':
            addPoint(shape.x, shape.y);
            addPoint(shape.x + shape.width, shape.y);
            addPoint(shape.x + shape.width, shape.y + shape.height);
            addPoint(shape.x, shape.y + shape.height);
            break;
        case 'circle':
            const segments = 32; // Approximate circle with a 32-sided polygon
            for (let i = 0; i < segments; i++) {
                const angle = (i / segments) * 2 * Math.PI;
                const x = cx + (shape.width / 2) * Math.cos(angle);
                const y = cy + (shape.height / 2) * Math.sin(angle);
                points.push({ x, y });
            }
            break;
        case 'polygon':
            const polyPoints = shape.points.split(' ').map(p => {
                const [x, y] = p.split(',').map(Number);
                return { x: shape.x + x, y: shape.y + y }; // to world coords
            });
            polyPoints.forEach(p => addPoint(p.x, p.y));
            break;
    }
    return points.flatMap(p => [p.x, p.y]);
}

async function performWasmOperation(shape1: Shape, shape2: Shape, opType: 'union' | 'subtract' | 'intersect' | 'exclude'): Promise<PolygonShape | null> {
    try {
        const wasmModule = await initializeWasm();
        const { MakePathD, PathsD, ClipType, FillRule, UnionD, IntersectD, DifferenceD, XorD } = wasmModule;

        const subjectPoints = shapeToPoints(shape1);
        const clipPoints = shapeToPoints(shape2);
        
        if (subjectPoints.length < 6 || clipPoints.length < 6) return null; // must be a valid polygon

        const subject = new PathsD();
        subject.push_back(MakePathD(subjectPoints));

        const clip = new PathsD();
        clip.push_back(MakePathD(clipPoints));

        const fillRule = FillRule.NonZero;
        let opFunction;

        switch (opType) {
            case 'union': opFunction = UnionD; break;
            case 'subtract': opFunction = DifferenceD; break;
            case 'intersect': opFunction = IntersectD; break;
            case 'exclude': opFunction = XorD; break;
        }

        const solution = opFunction(subject, clip, fillRule, 2);
        
        if (solution.size() === 0) {
            subject.delete();
            clip.delete();
            solution.delete();
            return null;
        }

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const resultPath = solution.get(0);
        const pointsArray: { x: number, y: number }[] = [];

        for (let i = 0; i < resultPath.size(); i++) {
            const p = resultPath.get(i);
            pointsArray.push({ x: p.x, y: p.y });
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        }

        subject.delete();
        clip.delete();
        solution.delete();
        resultPath.delete();
        
        const newShape: PolygonShape = {
            id: nanoid(),
            type: 'polygon',
            name: 'Combined Shape',
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
            rotation: 0,
            fill: (shape1.fill && shape1.fill !== 'none') ? shape1.fill : (shape2.fill && shape2.fill !== 'none' ? shape2.fill : '#cccccc'),
            strokeWidth: 0,
            opacity: 1,
            fillOpacity: 1,
            strokeOpacity: 1,
            points: pointsArray.map(p => `${p.x - minX},${p.y - minY}`).join(' '),
        };

        return newShape;

    } catch (error) {
        console.error("Boolean operation failed:", error);
        return null;
    }
}

// --- Public API ---
export async function union(shape1: Shape, shape2: Shape): Promise<PolygonShape | null> {
    return performWasmOperation(shape1, shape2, 'union');
}

export async function subtract(subjectShape: Shape, clipperShape: Shape): Promise<PolygonShape | null> {
    return performWasmOperation(subjectShape, clipperShape, 'subtract');
}

export async function intersect(shape1: Shape, shape2: Shape): Promise<PolygonShape | null> {
    return performWasmOperation(shape1, shape2, 'intersect');
}

export async function exclude(shape1: Shape, shape2: Shape): Promise<PolygonShape | null> {
    return performWasmOperation(shape1, shape2, 'exclude');
}
