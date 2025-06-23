export type ShapeType = 'rectangle' | 'circle' | 'polygon';

export type BaseShape = {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  fill: string;
  opacity: number;
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

export type Shape = RectangleShape | CircleShape | PolygonShape;

export type Tool = 'select' | ShapeType;

export type InteractionState =
  | { type: 'none' }
  | { type: 'drawing'; shapeType: ShapeType; startX: number; startY: number; currentShapeId: string; }
  | { type: 'moving'; startX: number; startY: number; initialShapes: Shape[] }
  | { type: 'resizing'; handle: 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se'; startX: number; startY: number; initialShapes: Shape[] }
  | { type: 'rotating'; startX: number; startY: number; initialShapes: Shape[] }
  | { type: 'panning', startX: number, startY: number };
