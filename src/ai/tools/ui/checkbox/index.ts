import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { TextShape, RectangleShape, PathShape } from '@/lib/types';
import { getTextDimensions } from '@/lib/geometry';
import {
  generatedShapes,
  RectangleShapeSchema,
  TextShapeSchema,
  PathShapeSchema,
} from '../../drawing';

const CheckboxParamsSchema = z.object({
  x: z.number().describe("The x-coordinate of the checkbox's top-left corner."),
  y: z.number().describe("The y-coordinate of the checkbox's top-left corner."),
  label: z.string().optional().describe('The text label for the checkbox.'),
  checked: z
    .boolean()
    .optional()
    .default(false)
    .describe('Whether the checkbox is checked.'),
  size: z.number().optional().default(20).describe('The size of the checkbox square.'),
});

export const drawCheckboxTool = ai.defineTool(
  {
    name: 'drawCheckbox',
    description: 'Draws a checkbox with an optional label and checked state.',
    inputSchema: CheckboxParamsSchema,
    outputSchema: z.object({
      box: RectangleShapeSchema,
      label: TextShapeSchema.optional(),
      checkmark: PathShapeSchema.optional(),
    }),
  },
  async (params) => {
    console.log('[drawCheckboxTool input]', params);

    const size = params.size;

    const box: RectangleShape = {
      id: nanoid(),
      type: 'rectangle',
      name: 'Checkbox',
      x: params.x,
      y: params.y,
      width: size,
      height: size,
      rotation: 0,
      opacity: 1,
      fill: '#333333',
      stroke: '#555555',
      strokeWidth: 1,
      borderRadius: 4,
      fillOpacity: 1,
      strokeOpacity: 1,
    };
    generatedShapes.push(box);

    let checkmark: PathShape | undefined;
    if (params.checked) {
      const checkPath = `M ${size * 0.2} ${size * 0.5} L ${size * 0.4} ${size * 0.7} L ${size * 0.8} ${size * 0.3}`;
      checkmark = {
        id: nanoid(),
        type: 'path',
        name: 'Checkmark',
        x: params.x,
        y: params.y,
        width: size,
        height: size,
        rotation: 0,
        opacity: 1,
        fill: 'none',
        stroke: '#ffffff',
        strokeWidth: 2,
        d: checkPath,
      };
      generatedShapes.push(checkmark);
    }

    let labelShape: TextShape | undefined;
    if (params.label) {
      const fontSize = size * 0.8;
      const { width: textWidth, height: textHeight } = getTextDimensions(
        params.label,
        fontSize,
        'Inter',
        'normal'
      );

      labelShape = {
        id: nanoid(),
        type: 'text',
        name: 'Checkbox Label',
        x: params.x + size + 8, // padding
        y: params.y + (size - textHeight) / 2,
        width: textWidth,
        height: textHeight,
        rotation: 0,
        opacity: 1,
        text: params.label,
        fontSize,
        fontFamily: 'Inter',
        fontWeight: 'normal',
        fill: '#ffffff',
      };
      generatedShapes.push(labelShape);
    }

    return { box, label: labelShape, checkmark };
  }
);
