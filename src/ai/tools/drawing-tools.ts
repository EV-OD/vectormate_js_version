/**
 * @fileOverview Defines and exports AI tools for drawing shapes on the canvas.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { type Shape, TextShape, RectangleShape } from '@/lib/types';
import { getTextDimensions } from '@/lib/geometry';

// This array will hold the results of the tool calls. It's exported so the flow can access it.
export const generatedShapes: Shape[] = [];

// --- Rectangle Tool ---
const RectangleParamsSchema = z.object({
  x: z.number().describe('The x-coordinate of the top-left corner.'),
  y: z.number().describe('The y-coordinate of the top-left corner.'),
  width: z.number().describe('The width of the rectangle.'),
  height: z.number().describe('The height of the rectangle.'),
  fill: z.string().optional().describe('The fill color in hex format (e.g., "#ff0000").'),
  borderRadius: z.number().optional().describe('The corner radius of the rectangle.'),
});
const RectangleShapeSchema = z.object({
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
export const drawRectangleTool = ai.defineTool(
  {
    name: 'drawRectangle',
    description: 'Draws a rectangle shape on the canvas.',
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
  cx: z.number().describe('The x-coordinate of the center of the circle/ellipse.'),
  cy: z.number().describe('The y-coordinate of the center of the circle/ellipse.'),
  radiusX: z.number().describe('The horizontal radius of the ellipse. For a circle, this is the radius.'),
  radiusY: z.number().describe('The vertical radius of the ellipse. For a circle, this should be equal to radiusX.'),
  fill: z.string().optional().describe('The fill color in hex format (e.g., "#ff0000").'),
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
    description: 'Draws a circle or an ellipse on the canvas. To draw a circle, ensure radiusX and radiusY are equal.',
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
  stroke: z.string().optional().describe('The stroke color in hex format (e.g., "#ff0000").'),
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
    description: 'Draws a line segment on the canvas.',
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
  text: z.string().describe('The text content to display.'),
  x: z.number().describe('The x-coordinate of the top-left corner of the text.'),
  y: z.number().describe('The y-coordinate of the top-left corner of the text.'),
  fontSize: z.number().optional().default(48).describe('The font size of the text.'),
  fontFamily: z.string().optional().default('Inter').describe('The font family of the text.'),
  fontWeight: z.enum(['normal', 'bold']).optional().default('normal').describe('The font weight of the text.'),
  fill: z.string().optional().describe('The fill color in hex format (e.g., "#ff0000").'),
});

const TextShapeSchema = z.object({
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

export const drawTextTool = ai.defineTool(
  {
    name: 'drawText',
    description: 'Draws text on the canvas.',
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

// --- Button Tool (Preset) ---
const ButtonParamsSchema = z.object({
    x: z.number().describe("The x-coordinate of the button's top-left corner."),
    y: z.number().describe("The y-coordinate of the button's top-left corner."),
    width: z.number().optional().default(150).describe("The width of the button."),
    height: z.number().optional().default(50).describe("The height of the button."),
    text: z.string().describe("The text label for the button."),
    backgroundColor: z.string().optional().default("#007bff").describe("The background color of the button in hex format."),
    textColor: z.string().optional().default("#ffffff").describe("The text color in hex format."),
});

const ButtonOutputSchema = z.object({
    buttonRectangle: RectangleShapeSchema,
    buttonText: TextShapeSchema,
});

export const drawButtonTool = ai.defineTool(
  {
    name: 'drawButton',
    description: 'Draws a complete button with a background rectangle and centered text. This is a preset tool.',
    inputSchema: ButtonParamsSchema,
    outputSchema: ButtonOutputSchema,
  },
  async (params): Promise<z.infer<typeof ButtonOutputSchema>> => {
    console.log('[drawButtonTool input]', params);

    // 1. Create the button rectangle
    const buttonRectangle: RectangleShape = {
      id: nanoid(),
      type: 'rectangle',
      name: `${params.text} Button`,
      x: params.x,
      y: params.y,
      width: params.width,
      height: params.height,
      rotation: 0,
      opacity: 1,
      fill: params.backgroundColor,
      fillOpacity: 1,
      strokeOpacity: 1,
      borderRadius: 8, // Default rounded corners for buttons
    };
    generatedShapes.push(buttonRectangle);

    // 2. Create the button text
    const fontSize = Math.min(params.height * 0.4, params.width / params.text.length * 1.5);
    const { width: textWidth, height: textHeight } = getTextDimensions(params.text, fontSize, 'Inter', 'bold');

    const textX = params.x + (params.width - textWidth) / 2;
    const textY = params.y + (params.height - textHeight) / 2;

    const buttonText: TextShape = {
      id: nanoid(),
      type: 'text',
      name: `${params.text} Label`,
      x: textX,
      y: textY,
      width: textWidth,
      height: textHeight,
      rotation: 0,
      opacity: 1,
      text: params.text,
      fontSize,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: params.textColor,
    };
    generatedShapes.push(buttonText);
    
    return { buttonRectangle, buttonText };
  }
);
