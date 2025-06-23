
import { type Shape, PolygonShape } from './types';
import * as martinez from 'martinez-polygon-clipping';
import { nanoid } from 'nanoid';

type MartinezPoint = [number, number];
type MartinezPolygon = MartinezPoint[][];
type MartinezMultiPolygon = MartinezPolygon[];

function shapeToMartinezPolygon(shape: Shape): MartinezPolygon | null {
    if (shape.type === 'line') return null;

    const points: MartinezPoint[] = [];
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;

    if (shape.type === 'rectangle') {
        points.push([shape.x, shape.y]);
        points.push([shape.x + shape.width, shape.y]);
        points.push([shape.x + shape.width, shape.y + shape.height]);
        points.push([shape.x, shape.y + shape.height]);
    } else if (shape.type === 'circle') {
        const sides = 64;
        const rx = shape.width / 2;
        const ry = shape.height / 2;
        for (let i = 0; i < sides; i++) {
            const angle = (i / sides) * 2 * Math.PI;
            points.push([
                cx + rx * Math.cos(angle),
                cy + ry * Math.sin(angle)
            ]);
        }
    } else if (shape.type === 'polygon') {
        const givenPoints = shape.points.split(' ').map(p => p.split(',').map(Number));
        givenPoints.forEach(p => {
            points.push([shape.x + p[0], shape.y + p[1]]);
        });
    }

    const angleRad = shape.rotation * (Math.PI / 180);
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);

    const rotatedPoints = points.map(([px, py]) => {
        const translatedX = px - cx;
        const translatedY = py - cy;
        const rotatedX = translatedX * cos - translatedY * sin + cx;
        const rotatedY = translatedX * sin + translatedY * cos + cy;
        return [rotatedX, rotatedY] as MartinezPoint;
    });

    return [rotatedPoints];
}

export function union(shape1: Shape, shape2: Shape): PolygonShape | null {
    const poly1 = shapeToMartinezPolygon(shape1);
    const poly2 = shapeToMartinezPolygon(shape2);

    if (!poly1 || !poly2) return null;

    try {
        const result = martinez.union(poly1, poly2) as MartinezMultiPolygon | null;
        if (!result || result.length === 0 || result[0].length === 0) return null;

        const resultPolygon = result[0][0];

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        resultPolygon.forEach(([px, py]) => {
            minX = Math.min(minX, px);
            minY = Math.min(minY, py);
            maxX = Math.max(maxX, px);
            maxY = Math.max(maxY, py);
        });

        const newBounds = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY,
        };

        const relativePoints = resultPolygon.map(([px, py]) => [px - newBounds.x, py - newBounds.y]);

        const newShape: PolygonShape = {
            id: nanoid(),
            type: 'polygon',
            name: 'Union',
            ...newBounds,
            rotation: 0,
            fill: shape1.fill || shape2.fill || '#cccccc',
            stroke: shape1.stroke || shape2.stroke,
            strokeWidth: shape1.strokeWidth || 0,
            opacity: shape1.opacity || 1,
            points: relativePoints.map(p => p.join(',')).join(' '),
        };

        return newShape;

    } catch (e) {
        console.error("Boolean operation failed:", e);
        return null;
    }
}
