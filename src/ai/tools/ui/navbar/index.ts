import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  drawRectangleTool,
  drawTextTool,
  RectangleShapeSchema,
  TextShapeSchema,
} from '../../drawing';
import { drawButtonTool, ButtonOutputSchema } from '../button';
import { getTextDimensions } from '@/lib/geometry';

const NavbarParamsSchema = z.object({
  x: z.number().describe('The top-left x-coordinate of the navbar.'),
  y: z.number().describe('The top-left y-coordinate of the navbar.'),
  width: z.number().default(1200).describe('The total width of the navbar.'),
  height: z.number().default(60).describe('The height of the navbar.'),
  brandText: z.string().describe('The text for the brand/logo area.'),
  menuItems: z
    .string()
    .describe(
      'A JSON string representing an array of menu item texts, e.g., `["Home", "Features", "Pricing"]`.'
    ),
  actionButtonText: z
    .string()
    .optional()
    .describe('Optional text for a call-to-action button on the right.'),
  layoutStyle: z
    .enum(['left-center-right', 'left-right'])
    .default('left-center-right')
    .describe(
      'The layout style. `left-center-right` places menu items in the center. `left-right` places menu items next to the brand.'
    ),
  backgroundColor: z
    .string()
    .optional()
    .describe('The background color of the navbar.'),
});

export const drawNavbarTool = ai.defineTool(
  {
    name: 'drawNavbar',
    description: 'Draws a complete navigation bar with a brand, menu items, and an optional action button.',
    inputSchema: NavbarParamsSchema,
    outputSchema: z.object({
      background: RectangleShapeSchema,
      brand: TextShapeSchema,
      menuItems: z.array(TextShapeSchema),
      actionButton: ButtonOutputSchema.optional(),
    }),
  },
  async (params) => {
    console.log('[drawNavbarTool input]', params);

    const PADDING = 20;
    const BRAND_FONT_SIZE = 20;
    const MENU_FONT_SIZE = 14;
    const MENU_ITEM_GAP = 30;

    let parsedMenuItems: string[] = [];
    try {
      parsedMenuItems = JSON.parse(params.menuItems);
    } catch (e) {
      console.error('Failed to parse menuItems JSON:', e);
      throw new Error('Invalid JSON string for menu items.');
    }

    const background = await drawRectangleTool({
      x: params.x,
      y: params.y,
      width: params.width,
      height: params.height,
      fill: params.backgroundColor ?? '#1a1a1a',
    });

    // 1. Brand
    const { height: brandTextHeight } = getTextDimensions(
      params.brandText,
      BRAND_FONT_SIZE,
      'Inter',
      'bold'
    );
    const brand = await drawTextTool({
      text: params.brandText,
      x: params.x + PADDING,
      y: params.y + (params.height - brandTextHeight) / 2,
      fontSize: BRAND_FONT_SIZE,
      fontWeight: 'bold',
      fill: '#ffffff',
    });

    let actionButton;
    let actionButtonWidth = 0;
    if (params.actionButtonText) {
      const buttonWidth = params.actionButtonText.length * 10 + 40;
      actionButton = await drawButtonTool({
        text: params.actionButtonText,
        x: params.x + params.width - buttonWidth - PADDING,
        y: params.y + (params.height - 40) / 2,
        width: buttonWidth,
        height: 40,
      });
      actionButtonWidth = buttonWidth + PADDING;
    }

    const menuTextShapes: TextShape[] = [];
    const menuItemDimensions = parsedMenuItems.map((item) =>
      getTextDimensions(item, MENU_FONT_SIZE, 'Inter', 'normal')
    );
    const totalMenuWidth =
      menuItemDimensions.reduce((sum, dim) => sum + dim.width, 0) +
      Math.max(0, parsedMenuItems.length - 1) * MENU_ITEM_GAP;

    let currentX: number;

    if (params.layoutStyle === 'left-center-right') {
      currentX = params.x + (params.width - totalMenuWidth) / 2;
    } else {
      // 'left-right'
      currentX = params.x + PADDING + brand.width + 50;
    }

    for (let i = 0; i < parsedMenuItems.length; i++) {
      const itemText = parsedMenuItems[i];
      const { width: itemWidth, height: itemHeight } = menuItemDimensions[i];
      const itemShape = await drawTextTool({
        text: itemText,
        x: currentX,
        y: params.y + (params.height - itemHeight) / 2,
        fontSize: MENU_FONT_SIZE,
        fill: '#cccccc',
      });
      menuTextShapes.push(itemShape);
      currentX += itemWidth + MENU_ITEM_GAP;
    }

    return { background, brand, menuItems: menuTextShapes, actionButton };
  }
);
