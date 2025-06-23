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

export type Handle = 'n' | 's' | 'e' | 'w' | 'nw' | 'ne' | 'sw' | 'se';

export type InteractionState =
  | { type: 'none' }
  | { type: 'drawing'; shapeType: ShapeType; startX: number; startY: number; currentShapeId: string; }
  | { type: 'moving'; startX: number; startY: number; initialShapes: Shape[] }
  | { type: 'resizing'; handle: Handle; startX: number; startY: number; initialShapes: Shape[]; aspectRatios: number[] }
  | { type: 'rotating'; startX: number; startY: number; initialShapes: Shape[] }
  | { type: 'panning', startX: number, startY: number, initialPan: { x: number, y: number } }
  | { type: 'marquee', startX: number, startY: number };

export type CanvasView = {
  background: 'solid' | 'grid' | 'dots';
  gridSize: number;
  snapToGrid: boolean;
  snapToObjects: boolean;
  scale: number;
  pan: { x: number, y: number };
};
