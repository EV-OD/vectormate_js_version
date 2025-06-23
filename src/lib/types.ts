'use client';

export type ShapeType = 'rectangle' | 'circle' | 'polygon' | 'line' | 'image' | 'svg' | 'path';

export type BaseShape = {
  id: string;
  name?: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill?: string;
  fillOpacity?: number;
  opacity?: number;
  stroke?: string;
  strokeOpacity?: number;
  strokeWidth?: number;
  borderRadius?: number;
};

export interface RectangleShape extends BaseShape {
  type: 'rectangle';
}

export interface CircleShape extends BaseShape {
  type: 'circle';
}

export interface PolygonShape extends BaseShape {
  type: 'polygon';
  points: string; // e.g., "0,0 100,0 50,100"
}

export interface LineShape extends BaseShape {
    type: 'line';
}

export interface ImageShape extends BaseShape {
  type: 'image';
  href: string;
}

export interface SVGShape extends BaseShape {
  type: 'svg';
  svgString: string;
}

export interface PathShape extends BaseShape {
  type: 'path';
  d: string;
}

export type Shape = RectangleShape | CircleShape | PolygonShape | LineShape | ImageShape | SVGShape | PathShape;

export type Tool = 'select' | 'rectangle' | 'circle' | 'polygon' | 'line' | 'brush';

export type Handle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se' | 'rotate';

export type InteractionState =
  | { type: 'none' }
  | { type: 'drawing'; shapeType: Tool; startX: number; startY: number; currentShapeId: string; }
  | { type: 'moving'; startX: number; startY: number; initialShapes: Shape[] }
  | { type: 'resizing'; handle: Handle; startX: number; startY: number; initialShapes: Shape[]; aspectRatios: number[] }
  | { type: 'rotating'; startX: number; startY: number; initialShapes: Shape[]; center: { x: number; y: number } }
  | { type: 'panning', startX: number, startY: number, initialPan: { x: number, y: number } }
  | { type: 'marquee', startX: number, startY: number }
  | { type: 'brushing', currentShapeId: string, points: { x: number, y: number }[] };

export type CanvasView = {
  background: 'solid' | 'grid' | 'dots';
  gridSize: number;
  snapToGrid: boolean;
  snapToObjects: boolean;
  scale: number;
  pan: { x: number, y: number };
};
