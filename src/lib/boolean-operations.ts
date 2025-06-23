
'use client';

import { type Shape, PolygonShape } from './types';
import { nanoid } from 'nanoid';
// Use `type` to ensure these are only for type checking and don't cause runtime import issues.
import { type Clipper2ZFactoryFunction, type MainModule } from 'clipper2-wasm';
import * as _Clipper2ZFactory from 'clipper2-wasm/dist/umd/clipper2z';

const Clipper2ZFactory: Clipper2ZFactoryFunction = _Clipper2ZFactory;

let wasmModule: MainModule | null = null;

// A single promise to ensure we only initialize the module once.
const wasmReady = new Promise<void>((resolve, reject) => {
  // We only want to run this in the browser, not during server-side rendering.
  if (typeof window === 'undefined') {
    // On the server, we resolve without a module. Operations will gracefully fail.
    return resolve();
  }
  Clipper2ZFactory({
    // This tells the factory where to find the .wasm file. It must be in the /public folder.
    locateFile: () => '/clipper2z.wasm',
  }).then((module: MainModule) => {
    wasmModule = module;
    resolve();
  }).catch(reject);
});


function shapeToPoints(shape: Shape): {x: number, y: number}[] {
    if (!wasmModule) throw new Error("WASM module not initialized");

    const angleRad = shape.rotation * (Math.PI / 180);
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    // Use the shape's center for rotation calculations
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;

    // Helper to rotate a point around the shape's center
    const transformPoint = (x: number, y: number): {x: number, y: number} => {
        const rotatedX = (x - cx) * cos - (y - cy) * sin + cx;
        const rotatedY = (x - cx) * sin + (y - cy) * cos + cy;
        return { x: rotatedX, y: rotatedY };
    };

    switch (shape.type) {
        case 'rectangle':
            return [
                transformPoint(shape.x, shape.y),
                transformPoint(shape.x + shape.width, shape.y),
                transformPoint(shape.x + shape.width, shape.y + shape.height),
                transformPoint(shape.x, shape.y + shape.height)
            ];
        case 'circle': {
            const points: {x: number, y: number}[] = [];
            const numSegments = 32; // A higher number makes a smoother circle
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
            return points;
        }
        case 'polygon': {
             return (shape as PolygonShape).points.split(' ').map(pStr => {
                const [px, py] = pStr.split(',').map(Number);
                const absoluteX = shape.x + px;
                const absoluteY = shape.y + py;
                return transformPoint(absoluteX, absoluteY);
            });
        }
        default:
            return [];
    }
}

function pathsToShape(paths: InstanceType<MainModule['PathsD']>, fill: string): PolygonShape | null {
    if (!wasmModule) throw new Error("WASM module not initialized");
    const { areaOfPathsD, getSinglePath } = wasmModule;

    if (areaOfPathsD(paths) === 0) {
        paths.delete();
        return null;
    }

    const path = getSinglePath(paths);
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

async function performWasmOperation(shape1: Shape, shape2: Shape, opTypeEnum: any): Promise<PolygonShape | null> {
    await wasmReady;
    if (!wasmModule) return null;

    const { PointD, PathD, PathsD, FillRule, booleanOp } = wasmModule;

    const points1_plain = shapeToPoints(shape1);
    const points2_plain = shapeToPoints(shape2);

    if (points1_plain.length === 0 || points2_plain.length === 0) {
        return null;
    }

    const path1 = new PathD();
    points1_plain.forEach(p => path1.push_back(new PointD(p.x, p.y, 0)));
    
    const path2 = new PathD();
    points2_plain.forEach(p => path2.push_back(new PointD(p.x, p.y, 0)));
    
    const paths1 = new PathsD();
    paths1.push_back(path1);
    const paths2 = new PathsD();
    paths2.push_back(path2);
    
    const fillRule = FillRule.EvenOdd;
    
    const resultPaths = booleanOp(opTypeEnum, fillRule, paths1, paths2);
    
    paths1.delete();
    paths2.delete();
    
    return pathsToShape(resultPaths, shape1.fill || '#cccccc');
}

export async function union(shape1: Shape, shape2: Shape): Promise<PolygonShape | null> {
    await wasmReady;
    if (!wasmModule) return null;
    return performWasmOperation(shape1, shape2, wasmModule.ClipType.Union);
}

export async function subtract(subjectShape: Shape, clipperShape: Shape): Promise<PolygonShape | null> {
    await wasmReady;
    if (!wasmModule) return null;
    return performWasmOperation(subjectShape, clipperShape, wasmModule.ClipType.Difference);
}

export async function intersect(shape1: Shape, shape2: Shape): Promise<PolygonShape | null> {
    await wasmReady;
    if (!wasmModule) return null;
    return performWasmOperation(shape1, shape2, wasmModule.ClipType.Intersect);
}

export async function exclude(shape1: Shape, shape2: Shape): Promise<PolygonShape | null> {
    await wasmReady;
    if (!wasmModule) return null;
    return performWasmOperation(shape1, shape2, wasmModule.ClipType.Xor);
}
