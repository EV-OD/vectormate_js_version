import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { TextShape, RectangleShape } from '@/lib/types';
import { getTextDimensions } from '@/lib/geometry';
import {
  generatedShapes,
  RectangleShapeSchema,
  TextShapeSchema,
  drawRectangleTool,
  drawTextTool,
  drawCircleTool,
} from '../../drawing';

const FrameParamsSchema = z.object({
  x: z.number().describe("The top-left x-coordinate of the frame."),
  y: z.number().describe("The top-left y-coordinate of the frame."),
  type: z.enum(['mobile', 'desktop']).default('desktop').describe("The type of frame to create."),
  width: z.number().optional().default(400).describe("The total width of the frame."),
  label: z.string().optional().describe("An optional label to display above the frame."),
});

export const drawFrameTool = ai.defineTool(
  {
    name: 'drawFrame',
    description: 'Draws a device frame (mobile or desktop) to act as a container for a UI design.',
    inputSchema: FrameParamsSchema,
    outputSchema: z.object({
      outerFrame: RectangleShapeSchema,
      screen: RectangleShapeSchema,
      label: TextShapeSchema.optional(),
    }),
  },
  async (params) => {
    console.log('[drawFrameTool input]', params);
    
    const isMobile = params.type === 'mobile';
    const aspectRatio = isMobile ? 16 / 9 : 9 / 16;
    const width = params.width ?? (isMobile ? 320 : 1024);
    const height = width * aspectRatio;
    
    let currentY = params.y;

    let labelShape: TextShape | undefined;
    if (params.label) {
        const { width: labelWidth, height: labelHeight } = getTextDimensions(params.label, 16, 'Inter', 'bold');
        labelShape = await drawTextTool({
            text: params.label,
            x: params.x + (width - labelWidth) / 2,
            y: currentY,
            fontSize: 16,
            fontWeight: 'bold',
            fill: '#ffffff',
        });
        currentY += labelHeight + 15;
    }
    
    const outerFrame = await drawRectangleTool({
        x: params.x,
        y: currentY,
        width: width,
        height: height,
        fill: '#1a1a1a',
        borderRadius: isMobile ? 24 : 12,
    });

    const padding = width * 0.04;

    const screen = await drawRectangleTool({
        x: params.x + padding,
        y: currentY + padding,
        width: width - padding * 2,
        height: height - padding * 2,
        fill: '#000000',
        borderRadius: isMobile ? 16 : 8,
    });

    if (isMobile) {
        await drawCircleTool({
            cx: params.x + width / 2,
            cy: currentY + padding * 1.5,
            radiusX: 6,
            radiusY: 6,
            fill: '#111111',
        });
    }

    return { outerFrame, screen, label: labelShape };
  }
);
