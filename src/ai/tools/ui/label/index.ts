import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { TextShape } from '@/lib/types';
import { getTextDimensions } from '@/lib/geometry';
import {
  generatedShapes,
  TextShapeSchema,
} from '../../drawing';

const LabelParamsSchema = z.object({
  text: z.string().describe('The text content of the label.'),
  x: z.number().describe("The label's top-left x-coordinate."),
  y: z.number().describe("The label's top-left y-coordinate."),
  fontSize: z.number().optional().default(14).describe('The font size of the label text in pixels.'),
});

export const drawLabelTool = ai.defineTool(
  {
    name: 'drawLabel',
    description:
      'Draws a simple text label. This is typically used to identify a nearby UI element, such as an input field or a checkbox.',
    inputSchema: LabelParamsSchema,
    outputSchema: TextShapeSchema,
  },
  async (params): Promise<z.infer<typeof TextShapeSchema>> => {
    console.log('[drawLabelTool input]', params);
    const { width, height } = getTextDimensions(
      params.text,
      params.fontSize ?? 14,
      'Inter',
      'normal'
    );
    const newShape: TextShape = {
      id: nanoid(),
      type: 'text',
      name: 'Label',
      x: params.x,
      y: params.y,
      width,
      height,
      rotation: 0,
      opacity: 1,
      text: params.text,
      fontSize: params.fontSize ?? 14,
      fontFamily: 'Inter',
      fontWeight: 'normal',
      fill: '#eeeeee',
    };
    generatedShapes.push(newShape);
    return newShape;
  }
);
