import { type Shape, PathShape, TextShape } from '@/lib/types';

export function getHexagonPoints(width: number, height: number): string {
    const cx = width / 2;
    const cy = height / 2;
    const points: [number, number][] = [];
    for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + Math.PI / 6;
        points.push([
            cx + (width / 2) * Math.cos(angle),
            cy + (height / 2) * Math.sin(angle),
        ]);
    }
    return points.map(p => p.map(c => Math.round(c)).join(',')).join(' ');
}

export function scalePolygonPoints(pointsStr: string, oldWidth: number, oldHeight: number, newWidth: number, newHeight: number): string {
    if (!pointsStr || oldWidth === 0 || oldHeight === 0) {
        return pointsStr;
    }

    const scaleX = newWidth / oldWidth;
    const scaleY = newHeight / oldHeight;

    const points = pointsStr.split(' ').map(p => {
        const [x, y] = p.split(',').map(Number);
        return { x, y };
    });

    const scaledPoints = points.map(p => ({
        x: p.x * scaleX,
        y: p.y * scaleY
    }));

    return scaledPoints.map(p => `${p.x},${p.y}`).join(' ');
}

export function scalePathData(d: string, oldWidth: number, oldHeight: number, newWidth: number, newHeight: number): string {
    if (oldWidth === 0 || oldHeight === 0) return d;

    const scaleX = newWidth / oldWidth;
    const scaleY = newHeight / oldHeight;

    const commandRegex = /([ML])\s*([\d.-]+)\s*([\d.-]+)/gi;
    
    return d.replace(commandRegex, (match, command, x, y) => {
        const scaledX = (parseFloat(x) * scaleX).toFixed(2);
        const scaledY = (parseFloat(y) * scaleY).toFixed(2);
        return `${command} ${scaledX} ${scaledY}`;
    });
}

export const getBounds = (shapes: Shape[]) => {
    if (shapes.length === 0) return { x: 0, y: 0, width: 0, height: 0 };

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    shapes.forEach(shape => {
        const cx = shape.x + shape.width / 2;
        const cy = shape.y + shape.height / 2;
        const angleRad = shape.rotation * (Math.PI / 180);
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);

        const corners = [
            { x: shape.x, y: shape.y },
            { x: shape.x + shape.width, y: shape.y },
            { x: shape.x, y: shape.y + shape.height },
            { x: shape.x + shape.width, y: shape.y + shape.height },
        ];

        corners.forEach(corner => {
            const rotatedX = (corner.x - cx) * cos - (corner.y - cy) * sin + cx;
            const rotatedY = (corner.x - cx) * sin + (corner.y - cy) * cos + cy;
            minX = Math.min(minX, rotatedX);
            maxX = Math.max(maxX, rotatedX);
            minY = Math.min(minY, rotatedY);
            maxY = Math.max(maxY, rotatedY);
        });
    });

    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
};


export function getTextDimensions(
  text: string, 
  fontSize: number, 
  fontFamily: string, 
  fontWeight: string
): { width: number, height: number } {
  if (typeof document === 'undefined') {
    return { width: text.length * (fontSize / 1.8), height: fontSize * 1.2 };
  }
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    return { width: text.length * (fontSize / 1.8), height: fontSize * 1.2 };
  }
  context.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
  const metrics = context.measureText(text);
  
  const height = (metrics.fontBoundingBoxAscent ?? fontSize) + (metrics.fontBoundingBoxDescent ?? (fontSize * 0.2));
  
  return { 
    width: metrics.width, 
    height: height
  };
}
