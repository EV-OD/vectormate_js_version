import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { TextShape, RectangleShape } from '@/lib/types';
import { getTextDimensions } from '@/lib/geometry';
import {
  generatedShapes,
  RectangleShapeSchema,
  TextShapeSchema,
} from '../../drawing';

const InputBoxParamsSchema = z.object({
  x: z.number().describe("The x-coordinate of the input box's top-left corner."),
  y: z.number().describe("The y-coordinate of the input box's top-left corner."),
  width: z.number().optional().default(250).describe('The width of the input box.'),
  height: z.number().optional().default(40).describe('The height of the input box.'),
  placeholderText: z
    .string()
    .optional()
    .describe('The placeholder text for the input.'),
  backgroundColor: z.string().optional().describe('The background color in hex format.'),
  borderColor: z
    .string()
    .optional()
    .default('#555555')
    .describe('The border color in hex format.'),
});

export const drawInputBoxTool = ai.defineTool(
  {
    name: 'drawInputBox',
    description: 'Draws a styled input box, optionally with placeholder text.',
    inputSchema: InputBoxParamsSchema,
    outputSchema: z.object({
      inputRectangle: RectangleShapeSchema,
      inputText: TextShapeSchema.optional(),
    }),
  },
  async (params) => {
    console.log('[drawInputBoxTool input]', params);

    const inputBox: RectangleShape = {
      id: nanoid(),
      type: 'rectangle',
      name: 'Input Box',
      x: params.x,
      y: params.y,
      width: params.width,
      height: params.height,
      rotation: 0,
      opacity: 1,
      fill: params.backgroundColor ?? '#333333',
      stroke: params.borderColor,
      strokeWidth: 1,
      fillOpacity: 1,
      strokeOpacity: 1,
      borderRadius: 6,
    };
    generatedShapes.push(inputBox);

    let placeholderShape: TextShape | undefined;
    if (params.placeholderText) {
      const fontSize = params.height * 0.4;
      const { width: textWidth, height: textHeight } = getTextDimensions(
        params.placeholderText,
        fontSize,
        'Inter',
        'normal'
      );

      placeholderShape = {
        id: nanoid(),
        type: 'text',
        name: 'Placeholder',
        x: params.x + 10, // Padding
        y: params.y + (params.height - textHeight) / 2,
        width: textWidth,
        height: textHeight,
        rotation: 0,
        opacity: 0.6,
        text: params.placeholderText,
        fontSize,
        fontFamily: 'Inter',
        fontWeight: 'normal',
        fill: '#ffffff',
      };
      generatedShapes.push(placeholderShape);
    }

    return { inputRectangle: inputBox, inputText: placeholderShape };
  }
);
