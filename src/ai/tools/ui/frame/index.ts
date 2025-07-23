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
  x: z.number().describe("The top-left x-coordinate of the entire frame component."),
  y: z.number().describe("The top-left y-coordinate of the entire frame component."),
  type: z.enum(['mobile', 'desktop']).default('desktop').describe("The type of device frame to create. This determines the aspect ratio and styling details. 'mobile' typically has a portrait aspect ratio, 'desktop' has a landscape one."),
  width: z.number().optional().default(400).describe("The total width of the frame. The height will be calculated automatically based on the frame type's aspect ratio."),
  label: z.string().optional().describe("An optional text label to display above the frame, useful for titling mockups."),
});

export const drawFrameTool = ai.defineTool(
  {
    name: 'drawFrame',
    description: 'Draws a device frame (either mobile or desktop) which can be used as a container for a UI design. Includes an outer body, an inner screen, and optional details like a camera notch for mobile.',
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
    const width = params.width ?? 400;
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
