'use server';
/**
 * @fileOverview A flow for generating shapes on the canvas based on a prompt.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {nanoid} from 'nanoid';
import {type Shape} from '@/lib/types';

// This array will hold the results of the tool calls.
const generatedShapes: Shape[] = [];

// --- Rectangle Tool ---
const RectangleParamsSchema = z.object({
  x: z.number().describe('The x-coordinate of the top-left corner.'),
  y: z.number().describe('The y-coordinate of the top-left corner.'),
  width: z.number().describe('The width of the rectangle.'),
  height: z.number().describe('The height of the rectangle.'),
  fill: z.string().optional().describe('The fill color in hex format (e.g., "#ff0000").'),
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
    const newShape = {
      id: nanoid(),
      type: 'rectangle' as const,
      name: 'Rectangle',
      ...params,
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


/**
 * The main flow for generating shapes on the canvas.
 * It takes a user prompt and returns an array of generated shapes.
 */
export const canvasFlow = ai.defineFlow(
  {
    name: 'canvasFlow',
    inputSchema: z.string(),
    outputSchema: z.array(z.any()),
  },
  async (prompt) => {
    console.log(`[canvasFlow] received prompt: "${prompt}"`);
    
    // Clear previously generated shapes before a new run.
    generatedShapes.length = 0;

    const llmResponse = await ai.generate({
        prompt: `You are a creative assistant for a vector design application. Your primary task is to interpret the user's text prompt and use the available tools to create shapes on the canvas. Carefully analyze the user's request and break it down into one or more function calls to the provided tools. Pay close attention to the tool's input schema and description to understand its capabilities. The user's prompt is: "${prompt}"`,
        model: 'googleai/gemini-1.5-flash',
        tools: [drawRectangleTool, drawCircleTool, drawLineTool],
    });
    console.log(llmResponse);

    console.log('[canvasFlow] generated shapes:', generatedShapes);
    return generatedShapes;
  }
);
