
'use client';

import { type Shape, PolygonShape } from './types';
import { nanoid } from 'nanoid';
// Use `type` to ensure these are only for type checking and don't cause runtime import issues.
import { type Clipper2ZFactoryFunction, type MainModule } from 'clipper2-wasm/dist/clipper2z';
import * as _Clipper2ZFactory from 'clipper2-wasm/dist/umd/clipper2z';

// Correctly access the factory function, handling default export for UMD modules.
const Clipper2ZFactory: Clipper2ZFactoryFunction = (_Clipper2ZFactory as any).default || _Clipper2ZFactory;

let wasmModule: MainModule | null = null;
let wasmReadyPromise: Promise<void> | null = null;

// Function to initialize WASM, ensuring it only runs once.
const initializeWasm = () => {
    if (wasmReadyPromise) {
        return wasmReadyPromise;
    }
    wasmReadyPromise = new Promise<void>((resolve, reject) => {
        // Guard against running on the server
        if (typeof window === 'undefined') {
            return resolve(); // Resolve without a module on SSR
        }
        Clipper2ZFactory({
            locateFile: () => '/clipper2z.wasm',
        }).then((module: MainModule) => {
            wasmModule = module;
            resolve();
        }).catch(reject);
    });
    return wasmReadyPromise;
};


function shapeToPoints(shape: Shape, wasm: MainModule): InstanceType<MainModule['PointD']>[] {
    const angleRad = shape.rotation * (Math.PI / 180);
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;

    const transformPoint = (x: number, y: number): InstanceType<MainModule['PointD']> => {
        const rotatedX = (x - cx) * cos - (y - cy) * sin + cx;
        const rotatedY = (x - cx) * sin + (y - cy) * cos + cy;
        return new wasm.PointD(rotatedX, rotatedY, 0);
    };
    
    let points: InstanceType<MainModule['PointD']>[] = [];

    switch (shape.type) {
        case 'rectangle':
            points = [
                transformPoint(shape.x, shape.y),
                transformPoint(shape.x + shape.width, shape.y),
                transformPoint(shape.x + shape.width, shape.y + shape.height),
                transformPoint(shape.x, shape.y + shape.height)
            ];
            break;
        case 'circle': {
            const numSegments = 32;
            const rx = shape.width / 2;
            const ry = shape.height / 2;
            const circleCenterX = shape.x + rx;
            const circleCenterY = shape.y + ry;
            for (let i = 0; i < numSegments; i++) {
                const angle = (i / numSegments) * 2 * Math.PI;
                const pointX = circleCenterX + Math.cos(angle) * rx;
                const pointY = circleCenterY + Math.sin(angle) * ry;
                points.push(transformPoint(pointX, pointY));
            }
            break;
        }
        case 'polygon': {
             points = (shape as PolygonShape).points.split(' ').map(pStr => {
                const [px, py] = pStr.split(',').map(Number);
                const absoluteX = shape.x + px;
                const absoluteY = shape.y + py;
                return transformPoint(absoluteX, absoluteY);
            });
            break;
        }
    }
    return points;
}

function pathsToShape(paths: InstanceType<MainModule['PathsD']>, fill: string, wasm: MainModule): PolygonShape | null {
    if (wasm.areaOfPathsD(paths) === 0) {
        paths.delete();
        return null;
    }

    const path = wasm.getSinglePath(paths);
    paths.delete();

    if (!path || path.size() === 0) {
        path?.delete();
        return null;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const pointsArray: {x: number, y: number}[] = [];

    for (let i = 0; i < path.size(); i++) {
        const p = path.get(i);
        pointsArray.push({ x: p.x, y: p.y });
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
    }
    path.delete();

    const newShape: PolygonShape = {
        id: nanoid(),
        type: 'polygon',
        name: 'Combined Shape',
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY,
        rotation: 0,
        fill: fill,
        points: pointsArray.map(p => `${(p.x - minX).toFixed(2)},${(p.y - minY).toFixed(2)}`).join(' '),
        strokeWidth: 0,
        opacity: 1,
        fillOpacity: 1,
        strokeOpacity: 1,
    };
    return newShape;
}


async function performWasmOperation(shape1: Shape, shape2: Shape, opType: 'union' | 'subtract' | 'intersect' | 'exclude'): Promise<PolygonShape | null> {
    await initializeWasm();
    if (!wasmModule) {
        console.error("WASM module failed to initialize.");
        return null;
    }

    const opTypeMap = {
        union: wasmModule.ClipType.Union,
        subtract: wasmModule.ClipType.Difference,
        intersect: wasmModule.ClipType.Intersect,
        exclude: wasmModule.ClipType.Xor
    };

    const points1_plain = shapeToPoints(shape1, wasmModule);
    const points2_plain = shapeToPoints(shape2, wasmModule);

    if (points1_plain.length === 0 || points2_plain.length === 0) {
        return null;
    }

    const path1 = new wasmModule.PathD();
    points1_plain.forEach(p => path1.push_back(p));
    points1_plain.forEach(p => p.delete()); // clean up points
    
    const path2 = new wasmModule.PathD();
    points2_plain.forEach(p => path2.push_back(p));
    points2_plain.forEach(p => p.delete()); // clean up points

    const paths1 = new wasmModule.PathsD();
    paths1.push_back(path1);
    const paths2 = new wasmModule.PathsD();
    paths2.push_back(path2);

    const opTypeEnum = opTypeMap[opType];
    const fillRule = wasmModule.FillRule.EvenOdd;
    
    const resultPaths = wasmModule.booleanOp(opTypeEnum, fillRule, paths1, paths2);
    
    // IMPORTANT: Clean up the memory allocated by wasm
    paths1.delete();
    paths2.delete();
    
    return pathsToShape(resultPaths, shape1.fill || '#cccccc', wasmModule);
}

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
