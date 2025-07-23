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

const CardParamsSchema = z.object({
  x: z.number().describe("The card's top-left x-coordinate."),
  y: z.number().describe("The card's top-left y-coordinate."),
  width: z.number().optional().default(300).describe('The width of the card container.'),
  height: z.number().optional().default(200).describe('The height of the card container.'),
  backgroundColor: z
    .string()
    .optional()
    .describe('The background color of the card in 6-digit hex format (e.g., "#2d2d2d").'),
  borderRadius: z
    .number()
    .optional()
    .default(12)
    .describe('The corner radius of the card, for rounded corners.'),
  title: z
    .string()
    .optional()
    .describe('An optional title to display at the top of the card. If provided, it will be rendered as a text element inside the card.'),
});

export const drawCardTool = ai.defineTool(
  {
    name: 'drawCard',
    description:
      'Draws a card element, which is a styled rectangular container for other content. Useful for grouping information. Can optionally include a title.',
    inputSchema: CardParamsSchema,
    outputSchema: z.object({
      cardRectangle: RectangleShapeSchema,
      titleText: TextShapeSchema.optional(),
    }),
  },
  async (params) => {
    console.log('[drawCardTool input]', params);

    const cardRectangle: RectangleShape = {
      id: nanoid(),
      type: 'rectangle',
      name: params.title ? `${params.title} Card` : 'Card',
      x: params.x,
      y: params.y,
      width: params.width ?? 300,
      height: params.height ?? 200,
      rotation: 0,
      opacity: 1,
      fill: params.backgroundColor ?? '#2d2d2d',
      fillOpacity: 1,
      strokeOpacity: 1,
      borderRadius: params.borderRadius,
    };
    generatedShapes.push(cardRectangle);

    let titleShape: TextShape | undefined;
    if (params.title) {
      const fontSize = 24;
      const { width: textWidth, height: textHeight } = getTextDimensions(
        params.title,
        fontSize,
        'Inter',
        'bold'
      );
      titleShape = {
        id: nanoid(),
        type: 'text',
        name: `${params.title} Title`,
        x: params.x + 20, // padding
        y: params.y + 20, // padding
        width: textWidth,
        height: textHeight,
        rotation: 0,
        opacity: 1,
        text: params.title,
        fontSize,
        fontFamily: 'Inter',
        fontWeight: 'bold',
        fill: '#ffffff',
      };
      generatedShapes.push(titleShape);
    }

    return { cardRectangle, titleText: titleShape };
  }
);
