'use server';
/**
 * @fileOverview A flow for generating shapes on the canvas based on a prompt.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {nanoid} from 'nanoid';

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
    return {
      id: nanoid(),
      type: 'rectangle',
      name: 'Rectangle',
      ...params,
      rotation: 0,
      opacity: 1,
      fill: params.fill ?? '#cccccc',
      fillOpacity: 1,
      strokeOpacity: 1,
    };
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

    const llmResponse = await canvasDotPrompt({
        prompt,
        tools: [drawRectangleTool],
    });
    console.log(llmResponse)

    const toolRequests = llmResponse.toolRequests;
    console.log('[canvasFlow] tool requests:', toolRequests);

    if (toolRequests.length === 0) {
      console.log('[canvasFlow] No tool requests from AI.');
      return [];
    }
    
    const toolResponses = [];
    for (const call of toolRequests) {
        if (call.tool === 'drawRectangle') {
            const result = await drawRectangleTool(
                call.input as z.infer<typeof RectangleParamsSchema>
            );
            toolResponses.push(result);
        }
    }

    console.log('[canvasFlow] generated shapes:', toolResponses);
    return toolResponses;
  }
);
