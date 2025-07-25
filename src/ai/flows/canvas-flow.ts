'use server';
/**
 * @fileOverview A flow for generating shapes on the canvas based on a prompt.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';

import {
    drawRectangleTool,
    drawCircleTool,
    drawLineTool,
    drawTextTool,
} from '@/ai/tools/drawing';
import { drawButtonTool } from '../tools/ui/button';
import { drawInputBoxTool } from '../tools/ui/input';
import { drawCheckboxTool } from '../tools/ui/checkbox';
import { drawSelectDropdownTool } from '../tools/ui/select';
import { drawLabelTool } from '../tools/ui/label';
import { drawCardTool } from '../tools/ui/card';
import { drawFormTool } from '../tools/ui/form';
import { generatedShapes } from '@/ai/tools/drawing';
import { drawFrameTool } from '../tools/ui/frame';
import { drawGridLayoutTool } from '../tools/ui/grid';
import { drawNavbarTool } from '../tools/ui/navbar';


const canvasPrompt = ai.prompt('canvas');

/**
 * The main flow for generating shapes on the canvas.
 * It takes a user prompt and returns an array of generated shapes.
 */
export const canvasFlow = ai.defineFlow(
  {
    name: 'canvasFlow',
    inputSchema: z.string(),
    outputSchema: z.array(z.any()),
  },
  async (prompt) => {
    console.log(`[canvasFlow] received prompt: "${prompt}"`);
    
    // Clear previously generated shapes before a new run.
    generatedShapes.length = 0;

    await canvasPrompt({
        prompt,
    }, {
        model: 'googleai/gemini-2.5-flash',
        tools: [
          drawRectangleTool, 
          drawCircleTool, 
          drawLineTool, 
          drawTextTool, 
          drawButtonTool,
          drawInputBoxTool,
          drawCheckboxTool,
          drawSelectDropdownTool,
          drawLabelTool,
          drawCardTool,
          drawFormTool,
          drawFrameTool,
          drawGridLayoutTool,
          drawNavbarTool,
        ],
    });

    console.log('[canvasFlow] generated shapes:', generatedShapes);
    return generatedShapes;
  }
);
