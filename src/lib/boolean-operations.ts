import { type Shape, PolygonShape } from './types';
import { nanoid } from 'nanoid';
import { Clipper2ZFactoryFunction, MainModule, PathD, PathsD, ClipType, FillRule, PointD } from 'clipper2-wasm';
import * as _Clipper2ZFactory from 'clipper2-wasm/dist/umd/clipper2z';

const Clipper2ZFactory: Clipper2ZFactoryFunction = _Clipper2ZFactory;

let wasmModule: MainModule | null = null;

const wasmReady = new Promise<void>((resolve, reject) => {
  Clipper2ZFactory({
    locateFile: () => '/clipper2z.wasm',
  }).then((module: MainModule) => {
    wasmModule = module;
    resolve();
  }).catch(reject);
});

function shapeToPoints(shape: Shape): PointD[] {
    if (!wasmModule) throw new Error("WASM module not initialized");

    const angleRad = shape.rotation * (Math.PI / 180);
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;

    const transformPoint = (x: number, y: number) => {
        const rotatedX = (x - cx) * cos - (y - cy) * sin + cx;
        const rotatedY = (x - cx) * sin + (y - cy) * cos + cy;
        return new wasmModule!.PointD(rotatedX, rotatedY);
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
            const points: PointD[] = [];
            const numSegments = 32;
            const rx = shape.width / 2;
            const ry = shape.height / 2;
            for (let i = 0; i < numSegments; i++) {
                const angle = (i / numSegments) * 2 * Math.PI;
                const x = shape.x + rx + Math.cos(angle) * rx;
                const y = shape.y + ry + Math.sin(angle) * ry;
                points.push(transformPoint(x, y));
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

function pathsToShape(paths: PathsD, fill: string): PolygonShape | null {
    if (!wasmModule) throw new Error("WASM module not initialized");
    if (wasmModule.areaOfPathsD(paths) === 0) {
        paths.delete();
        return null;
    }

    const path = wasmModule.getSinglePath(paths);
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

async function performWasmOperation(shape1: Shape, shape2: Shape, opType: ClipType): Promise<PolygonShape | null> {
    await wasmReady;
    if (!wasmModule) return null;

    const points1 = shapeToPoints(shape1);
    const points2 = shapeToPoints(shape2);

    if (points1.length === 0 || points2.length === 0) {
        return null;
    }

    const path1 = wasmModule.makePathD(points1);
    const path2 = wasmModule.makePathD(points2);
    
    const paths1 = new wasmModule.PathsD();
    paths1.push_back(path1);
    const paths2 = new wasmModule.PathsD();
    paths2.push_back(path2);
    
    const resultPaths = wasmModule.booleanOp(opType, FillRule.EvenOdd, paths1, paths2);
    
    paths1.delete();
    paths2.delete();
    
    return pathsToShape(resultPaths, shape1.fill || '#cccccc');
}

export async function union(shape1: Shape, shape2: Shape): Promise<PolygonShape | null> {
    if (!wasmModule) await wasmReady;
    return performWasmOperation(shape1, shape2, wasmModule!.ClipType.Union);
}

export async function subtract(subjectShape: Shape, clipperShape: Shape): Promise<PolygonShape | null> {
    if (!wasmModule) await wasmReady;
    return performWasmOperation(subjectShape, clipperShape, wasmModule!.ClipType.Difference);
}

export async function intersect(shape1: Shape, shape2: Shape): Promise<PolygonShape | null> {
    if (!wasmModule) await wasmReady;
    return performWasmOperation(shape1, shape2, wasmModule!.ClipType.Intersect);
}

export async function exclude(shape1: Shape, shape2: Shape): Promise<PolygonShape | null> {
    if (!wasmModule) await wasmReady;
    return performWasmOperation(shape1, shape2, wasmModule!.ClipType.Xor);
}
