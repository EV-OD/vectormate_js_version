/**
 * @fileOverview Defines and exports AI tools for drawing primitive shapes on the canvas.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { type Shape, TextShape, RectangleShape, PathShape } from '@/lib/types';
import { getTextDimensions } from '@/lib/geometry';

// This array will hold the results of all tool calls. It's exported so the flow and other tools can access it.
export const generatedShapes: Shape[] = [];

// --- Schemas ---
export const RectangleShapeSchema = z.object({
  id: z.string(),
  type: z.literal('rectangle'),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  opacity: z.number(),
  fill: z.string(),
  fillOpacity: z.number(),
  strokeOpacity: z.number(),
  borderRadius: z.number().optional(),
});

export const TextShapeSchema = z.object({
    id: z.string(),
    type: z.literal('text'),
    name: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    rotation: z.number(),
    opacity: z.number(),
    text: z.string(),
    fontSize: z.number(),
    fontFamily: z.string().optional(),
    fontWeight: z.enum(['normal', 'bold']).optional(),
    fill: z.string(),
});

export const PathShapeSchema = z.object({
  id: z.string(),
  type: z.literal('path'),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  rotation: z.number(),
  opacity: z.number(),
  fill: z.string(),
  stroke: z.string(),
  strokeWidth: z.number(),
  d: z.string(),
});


// --- Rectangle Tool ---
const RectangleParamsSchema = z.object({
  x: z.number().describe('The x-coordinate of the top-left corner of the rectangle.'),
  y: z.number().describe('The y-coordinate of the top-left corner of the rectangle.'),
  width: z.number().describe('The width of the rectangle in pixels.'),
  height: z.number().describe('The height of the rectangle in pixels.'),
  fill: z.string().optional().describe('The fill color in 6-digit hex format (e.g., "#ff0000" for red). Defaults to a gray color if not specified.'),
  borderRadius: z.number().optional().default(0).describe('The corner radius for creating rounded rectangles. A value of 0 means sharp corners.'),
});

export const drawRectangleTool = ai.defineTool(
  {
    name: 'drawRectangle',
    description: 'Draws a rectangle shape on the canvas. This is a fundamental building block for many UI elements.',
    inputSchema: RectangleParamsSchema,
    outputSchema: RectangleShapeSchema,
  },
  async (params): Promise<z.infer<typeof RectangleShapeSchema>> => {
    console.log('[drawRectangleTool input]', params);
    const newShape: RectangleShape = {
      id: nanoid(),
      type: 'rectangle' as const,
      name: 'Rectangle',
      ...params,
      rotation: 0,
      opacity: 1,
      fill: params.fill ?? '#cccccc',
      fillOpacity: 1,
      strokeOpacity: 1,
      borderRadius: params.borderRadius ?? 0,
    };
    generatedShapes.push(newShape);
    return newShape;
  }
);

// --- Circle/Ellipse Tool ---
const CircleParamsSchema = z.object({
  cx: z.number().describe('The x-coordinate of the center of the circle or ellipse.'),
  cy: z.number().describe('The y-coordinate of the center of the circle or ellipse.'),
  radiusX: z.number().describe('The horizontal radius. For a perfect circle, this must be equal to radiusY.'),
  radiusY: z.number().describe('The vertical radius. For a perfect circle, this must be equal to radiusX.'),
  fill: z.string().optional().describe('The fill color in 6-digit hex format (e.g., "#00ff00" for green). Defaults to a gray color.'),
});
const CircleShapeSchema = z.object({
    id: z.string(),
    type: z.literal('circle'),
    name: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    rotation: z.number(),
    opacity: z.number(),
    fill: z.string(),
    fillOpacity: z.number(),
    strokeOpacity: z.number(),
});
export const drawCircleTool = ai.defineTool(
  {
    name: 'drawCircleOrEllipse',
    description: 'Draws a circle or an ellipse on the canvas. To draw a perfect circle, ensure radiusX and radiusY are equal.',
    inputSchema: CircleParamsSchema,
    outputSchema: CircleShapeSchema,
  },
  async (params): Promise<z.infer<typeof CircleShapeSchema>> => {
    console.log('[drawCircleTool input]', params);
    const newShape = {
      id: nanoid(),
      type: 'circle' as const,
      name: params.radiusX === params.radiusY ? 'Circle' : 'Ellipse',
      x: params.cx - params.radiusX,
      y: params.cy - params.radiusY,
      width: params.radiusX * 2,
      height: params.radiusY * 2,
      rotation: 0,
      opacity: 1,
      fill: params.fill ?? '#cccccc',
      fillOpacity: 1,
      strokeOpacity: 1,
    };
    generatedShapes.push(newShape);
    return newShape;
  }
);

// --- Line Tool ---
const LineParamsSchema = z.object({
  x1: z.number().describe('The x-coordinate of the starting point of the line.'),
  y1: z.number().describe('The y-coordinate of the starting point of the line.'),
  x2: z.number().describe('The x-coordinate of the ending point of the line.'),
  y2: z.number().describe('The y-coordinate of the ending point of the line.'),
  stroke: z.string().optional().describe('The stroke color in 6-digit hex format (e.g., "#0000ff" for blue). Defaults to white.'),
});
const LineShapeSchema = z.object({
    id: z.string(),
    type: z.literal('line'),
    name: z.string(),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    rotation: z.number(),
    opacity: z.number(),
    stroke: z.string(),
    strokeWidth: z.number(),
    strokeOpacity: z.number(),
});
export const drawLineTool = ai.defineTool(
  {
    name: 'drawLine',
    description: 'Draws a straight line segment on the canvas from a start point (x1, y1) to an end point (x2, y2).',
    inputSchema: LineParamsSchema,
    outputSchema: LineShapeSchema,
  },
  async (params): Promise<z.infer<typeof LineShapeSchema>> => {
    console.log('[drawLineTool input]', params);
    const newShape = {
      id: nanoid(),
      type: 'line' as const,
      name: 'Line',
      x: params.x1,
      y: params.y1,
      width: params.x2 - params.x1,
      height: params.y2 - params.y1,
      rotation: 0,
      opacity: 1,
      stroke: params.stroke ?? '#ffffff',
      strokeWidth: 2,
      strokeOpacity: 1,
    };
    generatedShapes.push(newShape);
    return newShape;
  }
);

// --- Text Tool ---
const TextParamsSchema = z.object({
  text: z.string().describe('The text content to be displayed on the canvas.'),
  x: z.number().describe('The x-coordinate of the top-left corner of the text bounding box.'),
  y: z.number().describe('The y-coordinate of the top-left corner of the text bounding box.'),
  fontSize: z.number().optional().default(48).describe('The font size of the text in pixels.'),
  fontFamily: z.string().optional().default('Inter').describe('The font family to use for the text (e.g., "Inter", "Arial", "Verdana").'),
  fontWeight: z.enum(['normal', 'bold']).optional().default('normal').describe('The font weight of the text.'),
  fill: z.string().optional().describe('The fill color in 6-digit hex format (e.g., "#ffffff" for white). Defaults to white.'),
});

export const drawTextTool = ai.defineTool(
  {
    name: 'drawText',
    description: 'Draws a text element on the canvas. Use this for adding titles, labels, paragraphs, or any other textual content.',
    inputSchema: TextParamsSchema,
    outputSchema: TextShapeSchema,
  },
  async (params): Promise<z.infer<typeof TextShapeSchema>> => {
    console.log('[drawTextTool input]', params);
    const { width, height } = getTextDimensions(params.text, params.fontSize, params.fontFamily, params.fontWeight);
    const newShape: TextShape = {
      id: nanoid(),
      type: 'text',
      name: 'Text',
      x: params.x,
      y: params.y,
      width,
      height,
      rotation: 0,
      opacity: 1,
      text: params.text,
      fontSize: params.fontSize,
      fontFamily: params.fontFamily,
      fontWeight: params.fontWeight,
      fill: params.fill ?? '#ffffff',
    };
    generatedShapes.push(newShape);
    return newShape;
  }
);
