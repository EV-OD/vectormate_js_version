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

// Define the Zod schema for the input of our rectangle-drawing tool.
const RectangleParamsSchema = z.object({
  x: z.number().describe('The x-coordinate of the top-left corner.'),
  y: z.number().describe('The y-coordinate of the top-left corner.'),
  width: z.number().describe('The width of the rectangle.'),
  height: z.number().describe('The height of the rectangle.'),
  fill: z.string().optional().describe('The fill color in hex format (e.g., "#ff0000").'),
});

// Define the Zod schema for the output of our tool.
// This must match the actual return type of the tool's implementation.
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


// Define the tool that the AI can use to draw a rectangle.
export const drawRectangleTool = ai.defineTool(
  {
    name: 'drawRectangle',
    description: 'Draws a rectangle shape on the canvas.',
    inputSchema: RectangleParamsSchema,
    outputSchema: RectangleShapeSchema,
  },
  async (params): Promise<z.infer<typeof RectangleShapeSchema>> => {
    console.log('[drawRectangleTool input]', params);
    // Augment the AI's parameters with the standard shape properties.
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
    // Store the result of this tool call.
    generatedShapes.push(newShape);
    return newShape;
  }
);

const canvasDotPrompt = ai.prompt('canvas');

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

    const llmResponse = await canvasDotPrompt({
        prompt,
        tools: [drawRectangleTool],
    });
    console.log(llmResponse.text);

    console.log('[canvasFlow] generated shapes:', generatedShapes);
    return generatedShapes;
  }
);
