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

const SelectDropdownParamsSchema = z.object({
  x: z
    .number()
    .describe("The x-coordinate of the select dropdown's top-left corner."),
  y: z
    .number()
    .describe("The y-coordinate of the select dropdown's top-left corner."),
  width: z
    .number()
    .optional()
    .default(200)
    .describe('The width of the dropdown component.'),
  height: z
    .number()
    .optional()
    .default(40)
    .describe('The height of the dropdown component.'),
  text: z.string().describe('The text to display for the currently selected value (e.g., "Select an option", "New York").'),
});

export const drawSelectDropdownTool = ai.defineTool(
  {
    name: 'drawSelectDropdown',
    description: 'Draws a select dropdown component, a common UI element for choosing one option from a list. Includes the main box, the selected text, and a dropdown chevron icon.',
    inputSchema: SelectDropdownParamsSchema,
    outputSchema: z.object({
      box: RectangleShapeSchema,
      text: TextShapeSchema,
      chevron: PathShapeSchema,
    }),
  },
  async (params) => {
    console.log('[drawSelectDropdownTool input]', params);

    const box: RectangleShape = {
      id: nanoid(),
      type: 'rectangle',
      name: 'Select Box',
      x: params.x,
      y: params.y,
      width: params.width ?? 200,
      height: params.height ?? 40,
      rotation: 0,
      opacity: 1,
      fill: '#333333',
      stroke: '#555555',
      strokeWidth: 1,
      borderRadius: 6,
      fillOpacity: 1,
      strokeOpacity: 1,
    };
    generatedShapes.push(box);

    const fontSize = (params.height ?? 40) * 0.4;
    const { width: textWidth, height: textHeight } = getTextDimensions(
      params.text,
      fontSize,
      'Inter',
      'normal'
    );

    const textShape: TextShape = {
      id: nanoid(),
      type: 'text',
      name: 'Select Text',
      x: params.x + 10,
      y: params.y + ((params.height ?? 40) - textHeight) / 2,
      width: textWidth,
      height: textHeight,
      rotation: 0,
      opacity: 1,
      text: params.text,
      fontSize,
      fontFamily: 'Inter',
      fontWeight: 'normal',
      fill: '#ffffff',
    };
    generatedShapes.push(textShape);

    const chevronSize = (params.height ?? 40) * 0.3;
    const chevronPath = `M 0 0 L ${chevronSize / 2} ${chevronSize / 2} L ${chevronSize} 0`;
    const chevron: PathShape = {
      id: nanoid(),
      type: 'path',
      name: 'Chevron',
      x: params.x + (params.width ?? 200) - chevronSize - 10,
      y: params.y + ((params.height ?? 40) - chevronSize / 2) / 2,
      width: chevronSize,
      height: chevronSize / 2,
      rotation: 0,
      opacity: 1,
      fill: 'none',
      stroke: '#ffffff',
      strokeWidth: 2,
      d: chevronPath,
    };
    generatedShapes.push(chevron);

    return { box, text: textShape, chevron };
  }
);
