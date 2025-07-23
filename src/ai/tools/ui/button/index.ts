import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { type Shape, TextShape, RectangleShape } from '@/lib/types';
import { getTextDimensions } from '@/lib/geometry';
import {
  generatedShapes,
  RectangleShapeSchema,
  TextShapeSchema,
} from '../../drawing';

const ButtonParamsSchema = z.object({
  x: z.number().describe("The button's top-left x-coordinate."),
  y: z.number().describe("The button's top-left y-coordinate."),
  width: z.number().optional().default(150).describe('The width of the button in pixels.'),
  height: z.number().optional().default(50).describe('The height of the button in pixels.'),
  text: z.string().describe('The text label displayed on the button (e.g., "Submit", "Click Me").'),
  backgroundColor: z.string().optional().describe('The background color of the button in 6-digit hex format (e.g., "#007bff").'),
  textColor: z.string().optional().describe('The text color in 6-digit hex format (e.g., "#ffffff").'),
});

export const ButtonOutputSchema = z.object({
  buttonRectangle: RectangleShapeSchema,
  buttonText: TextShapeSchema,
});
export type ButtonOutput = z.infer<typeof ButtonOutputSchema>;


export const drawButtonTool = ai.defineTool(
  {
    name: 'drawButton',
    description:
      'Draws a complete, clickable-looking button element with a background rectangle and centered text. This is a high-level component.',
    inputSchema: ButtonParamsSchema,
    outputSchema: ButtonOutputSchema,
  },
  async (params): Promise<z.infer<typeof ButtonOutputSchema>> => {
    console.log('[drawButtonTool input]', params);

    const width = params.width ?? 150;
    const height = params.height ?? 50;

    const buttonRectangle: RectangleShape = {
      id: nanoid(),
      type: 'rectangle',
      name: `${params.text} Button`,
      x: params.x,
      y: params.y,
      width: width,
      height: height,
      rotation: 0,
      opacity: 1,
      fill: params.backgroundColor ?? '#007bff',
      fillOpacity: 1,
      strokeOpacity: 1,
      borderRadius: 8,
    };
    generatedShapes.push(buttonRectangle);

    const fontSize = Math.min(height * 0.4, width / params.text.length * 1.5);
    const { width: textWidth, height: textHeight } = getTextDimensions(
      params.text,
      fontSize,
      'Inter',
      'bold'
    );

    const textX = params.x + (width - textWidth) / 2;
    const textY = params.y + (height - textHeight) / 2;

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
      fill: params.textColor ?? '#ffffff',
    };
    generatedShapes.push(buttonText);

    return { buttonRectangle, buttonText };
  }
);
