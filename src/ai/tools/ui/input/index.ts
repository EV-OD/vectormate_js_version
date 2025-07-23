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
  width: z.number().optional().default(250).describe('The width of the input box in pixels.'),
  height: z.number().optional().default(40).describe('The height of the input box in pixels.'),
  placeholderText: z
    .string()
    .optional()
    .describe('Optional grayed-out text to display inside the input box when it is empty.'),
  backgroundColor: z.string().optional().describe('The background color of the input box in 6-digit hex format. Defaults to dark gray.'),
  borderColor: z
    .string()
    .optional()
    .default('#555555')
    .describe('The border color of the input box in 6-digit hex format.'),
});

export const drawInputBoxTool = ai.defineTool(
  {
    name: 'drawInputBox',
    description: 'Draws a styled input box, a common UI element for text entry. Can optionally include placeholder text.',
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
      width: params.width ?? 250,
      height: params.height ?? 40,
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
      const fontSize = (params.height ?? 40) * 0.4;
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
        y: params.y + ((params.height ?? 40) - textHeight) / 2,
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
