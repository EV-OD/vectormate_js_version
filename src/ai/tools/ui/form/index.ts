
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { TextShape, RectangleShape } from '@/lib/types';
import { getTextDimensions } from '@/lib/geometry';
import {
  generatedShapes,
  drawTextTool,
  RectangleShapeSchema,
  TextShapeSchema,
} from '../../drawing';
import { drawButtonTool } from '../button';
import { drawInputBoxTool } from '../input';
import { drawLabelTool } from '../label';
import { drawCardTool } from '../card';
import { drawCheckboxTool } from '../checkbox';

const InputFieldSchema = z.object({
  type: z.literal('input'),
  label: z
    .string()
    .describe("The label for the input field (e.g., 'Username', 'Password')."),
  placeholder: z
    .string()
    .optional()
    .describe('The placeholder text for the input field.'),
});

const CheckboxFieldSchema = z.object({
  type: z.literal('checkbox'),
  label: z.string().describe('The label for the checkbox.'),
  checked: z.boolean().optional().describe('Whether the checkbox is checked.'),
});

const LinkFieldSchema = z.object({
  type: z.literal('link'),
  text: z.string().describe('The text to display for the link.'),
  align: z
    .enum(['left', 'center', 'right'])
    .optional()
    .default('center')
    .describe('The horizontal alignment of the link text.'),
});

const FormFieldSchema = z.union([
  InputFieldSchema,
  CheckboxFieldSchema,
  LinkFieldSchema,
]);

type FormField = z.infer<typeof FormFieldSchema>;

const FormParamsSchema = z.object({
  x: z.number().describe("The form container's top-left x-coordinate."),
  y: z.number().describe("The form container's top-left y-coordinate."),
  width: z.number().optional().default(400).describe('The width of the form.'),
  title: z
    .string()
    .describe("The title of the form, like 'Login' or 'Sign Up'."),
  fields: z
    .string()
    .describe(
      'A JSON string representing an array of fields to include in the form. Example: `[{"type": "input", "label": "Email"}, {"type": "checkbox", "label": "Remember me"}]`'
    ),
  buttonText: z
    .string()
    .describe(
      "The text for the submit button (e.g., 'Log In', 'Create Account')."
    ),
});

export const drawFormTool = ai.defineTool(
  {
    name: 'drawForm',
    description:
      'Draws a complete UI form, including a title, various fields (inputs, checkboxes, links), and a submit button. This is a high-level component tool.',
    inputSchema: FormParamsSchema,
    outputSchema: z.object({
      card: RectangleShapeSchema,
      title: TextShapeSchema,
    }),
  },
  async (params) => {
    console.log('[drawFormTool input]', params);

    let parsedFields: FormField[] = [];
    try {
      parsedFields = JSON.parse(params.fields);
    } catch (e) {
      console.error('Failed to parse form fields JSON:', e);
      throw new Error('Invalid JSON string for form fields.');
    }


    const PADDING = 25;
    const TITLE_FONT_SIZE = 28;
    const LABEL_FONT_SIZE = 14;
    const INPUT_HEIGHT = 40;
    const BUTTON_HEIGHT = 45;
    const GAP_TITLE_INPUT = 25;
    const GAP_FIELD = 20;
    const GAP_LABEL_INPUT = 8;
    const GAP_LAST_INPUT_BUTTON = 30;

    const formWidth = params.width ?? 400;
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

    for (const field of parsedFields) {
      switch (field.type) {
        case 'input': {
          const { height: labelHeight } = getTextDimensions(
            field.label,
            LABEL_FONT_SIZE,
            'Inter',
            'normal'
          );
          await drawLabelTool({
            text: field.label,
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
            placeholderText: field.placeholder,
          });
          currentY += INPUT_HEIGHT;
          break;
        }
        case 'checkbox': {
          await drawCheckboxTool({
            x: params.x + PADDING,
            y: currentY,
            label: field.label,
            checked: field.checked,
          });
          currentY += 20; // Approx height of checkbox
          break;
        }
        case 'link': {
          const LINK_FONT_SIZE = 14;
          const { width: linkWidth, height: linkHeight } = getTextDimensions(
            field.text,
            LINK_FONT_SIZE,
            'Inter',
            'normal'
          );

          let linkX = params.x + PADDING;
          if (field.align === 'center') {
            linkX = params.x + (formWidth - linkWidth) / 2;
          } else if (field.align === 'right') {
            linkX = params.x + formWidth - PADDING - linkWidth;
          }

          await drawTextTool({
            text: field.text,
            x: linkX,
            y: currentY,
            fontSize: LINK_FONT_SIZE,
            fill: '#0099ff', // A link-like blue color
          });
          currentY += linkHeight;
          break;
        }
      }
      currentY += GAP_FIELD;
    }

    currentY -= GAP_FIELD;
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
