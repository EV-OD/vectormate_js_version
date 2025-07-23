'use server';
/**
 * @fileOverview A flow for generating shapes on the canvas based on a prompt.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';
import {Shape} from '@/lib/types';
import {nanoid} from 'nanoid';

// Define the Zod schema for the output of our rectangle-drawing tool.
// This must match the properties of the Shape types in the app.
const RectangleShapeSchema = z.object({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
});

// Define the tool that the AI can use to draw a rectangle.
export const drawRectangleTool = ai.defineTool(
  {
    name: 'drawRectangle',
    description: 'Draws a rectangle shape on the canvas.',
    inputSchema: RectangleShapeSchema,
    outputSchema: RectangleShapeSchema.extend({
      id: z.string(),
      type: z.literal('rectangle'),
      name: z.string(),
      rotation: z.number(),
      opacity: z.number(),
      fillOpacity: z.number(),
      strokeOpacity: z.number(),
    }),
  },
  async (params) => {
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
    outputSchema: z.array(z.any()), // For now, we return any shape object.
  },
  async (prompt) => {
    console.log(`[canvasFlow] received prompt: "${prompt}"`);

    const llmResponse = await canvasDotPrompt({
      prompt: prompt,
      tools: [drawRectangleTool],
    });

    const toolRequests = llmResponse.toolRequests;
    console.log('[canvasFlow] tool requests:', toolRequests);

    if (toolRequests.length === 0) {
      console.log('[canvasFlow] No tool requests from AI.');
      return [];
    }

    const toolResponses = [];
    for (const call of toolRequests) {
      if (call.toolRequest.name === 'drawRectangle') {
        const result = await drawRectangleTool(
          call.toolRequest.input as z.infer<typeof RectangleShapeSchema>
        );
        toolResponses.push(result);
      }
    }

    console.log('[canvasFlow] generated shapes:', toolResponses);
    return toolResponses;
  }
);
