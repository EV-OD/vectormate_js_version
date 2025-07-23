import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { TextShape, RectangleShape } from '@/lib/types';
import { getTextDimensions } from '@/lib/geometry';
import {
  generatedShapes,
  drawRectangleTool,
  drawTextTool,
  RectangleShapeSchema,
  TextShapeSchema,
} from '../../drawing';
import { drawButtonTool } from '../button';
import { drawInputBoxTool } from '../input';
import { drawLabelTool } from '../label';
import { drawCardTool } from '../card';

const FormParamsSchema = z.object({
  x: z.number().describe("The form container's top-left x-coordinate."),
  y: z.number().describe("The form container's top-left y-coordinate."),
  width: z.number().optional().default(350).describe('The width of the form.'),
  title: z
    .string()
    .describe("The title of the form, like 'Login' or 'Sign Up'."),
  inputs: z
    .array(
      z.object({
        label: z
          .string()
          .describe("The label for the input field (e.g., 'Username', 'Password')."),
        placeholder: z
          .string()
          .optional()
          .describe('The placeholder text for the input field.'),
      })
    )
    .describe('An array of input fields to include in the form.'),
  buttonText: z
    .string()
    .describe("The text for the submit button (e.g., 'Log In', 'Create Account')."),
});

export const drawFormTool = ai.defineTool(
  {
    name: 'drawForm',
    description:
      'Draws a complete UI form, including a title, input fields with labels, and a submit button. This is a high-level component tool.',
    inputSchema: FormParamsSchema,
    outputSchema: z.object({
      card: RectangleShapeSchema,
      title: TextShapeSchema,
    }),
  },
  async (params) => {
    console.log('[drawFormTool input]', params);

    const PADDING = 25;
    const TITLE_FONT_SIZE = 28;
    const LABEL_FONT_SIZE = 14;
    const INPUT_HEIGHT = 40;
    const BUTTON_HEIGHT = 45;
    const GAP_TITLE_INPUT = 25;
    const GAP_INPUT_GROUP = 20;
    const GAP_LABEL_INPUT = 8;
    const GAP_LAST_INPUT_BUTTON = 30;

    const formWidth = params.width ?? 350;
    let currentY = params.y + PADDING;

    const { width: titleWidth, height: titleHeight } = getTextDimensions(
      params.title,
      TITLE_FONT_SIZE,
      'Inter',
      'bold'
    );
    const titleShape = await drawTextTool({
      text: params.title,
      x: params.x + (formWidth - titleWidth) / 2,
      y: currentY,
      fontSize: TITLE_FONT_SIZE,
      fontWeight: 'bold',
      fill: '#ffffff',
    });
    currentY += titleHeight + GAP_TITLE_INPUT;

    for (const input of params.inputs) {
      const { height: labelHeight } = getTextDimensions(
        input.label,
        LABEL_FONT_SIZE,
        'Inter',
        'normal'
      );
      await drawLabelTool({
        text: input.label,
        x: params.x + PADDING,
        y: currentY,
        fontSize: LABEL_FONT_SIZE,
      });
      currentY += labelHeight + GAP_LABEL_INPUT;

      await drawInputBoxTool({
        x: params.x + PADDING,
        y: currentY,
        width: formWidth - PADDING * 2,
        height: INPUT_HEIGHT,
        placeholderText: input.placeholder,
      });
      currentY += INPUT_HEIGHT + GAP_INPUT_GROUP;
    }

    currentY -= GAP_INPUT_GROUP;
    currentY += GAP_LAST_INPUT_BUTTON;

    await drawButtonTool({
      x: params.x + PADDING,
      y: currentY,
      width: formWidth - PADDING * 2,
      height: BUTTON_HEIGHT,
      text: params.buttonText,
    });
    currentY += BUTTON_HEIGHT;

    const totalHeight = currentY - params.y + PADDING;
    const cardShape = await drawCardTool({
      x: params.x,
      y: params.y,
      width: formWidth,
      height: totalHeight,
      title: '',
    });

    const cardIndex = generatedShapes.findIndex(
      (s) => s.id === cardShape.cardRectangle.id
    );
    if (cardIndex > -1) {
      const [cardToMove] = generatedShapes.splice(cardIndex, 1);
      generatedShapes.unshift(cardToMove);
    }

    return { card: cardShape.cardRectangle, title: titleShape };
  }
);
