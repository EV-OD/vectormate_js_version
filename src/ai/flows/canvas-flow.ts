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

    await ai.generate({
        prompt: `You are an expert UI/UX designer and creative assistant for a vector design application. Your primary task is to interpret the user's text prompt and translate it into a visually appealing design on the canvas by calling the provided tools.

### Core Principles
1.  **Deconstruct the Request**: Break down the user's prompt into logical components. For a complex request like "a login form," identify the necessary elements: a container, a title, input fields, labels, a button, and maybe a link.
2.  **Think in Containers**: For UI layouts, start with a container tool like \`drawCardTool\` or \`drawFrameTool\` to establish a boundary for your components.
3.  **Use High-Level Tools**: Prefer composite tools like \`drawFormTool\`, \`drawNavbarTool\`, or \`drawButtonTool\` when the user's request matches them. These tools create more complete and better-styled components.
4.  **Mind the Details**: Pay attention to alignment, spacing, and hierarchy. Center titles, align form elements, and use appropriate sizes.

### Critical Rule: JSON String Parameters
Some tools (\`drawFormTool\`, \`drawGridLayoutTool\`, \`drawNavbarTool\`) accept parameters that must be valid JSON strings. You **MUST** format the value for these parameters as a well-formed JSON string. Do not provide a JavaScript object directly.

**Correct Example (for \`items\` in \`drawGridLayoutTool\`):**
\`\`\`json
"[{\\"toolName\\": \\"drawButton\\", \\"params\\": {\\"text\\": \\"Sign Up\\", \\"backgroundColor\\": \\"#28a745\\"}}, {\\"toolName\\": \\"drawButton\\", \\"params\\": {\\"text\\": \\"Learn More\\", \\"backgroundColor\\": \\"transparent\\"}}]"
\`\`\`

**Incorrect Example:**
\`\`\`javascript
[{toolName: "drawButton", params: {text: "Sign Up"}}]
\`\`\`

Now, analyze the user's request below and generate the appropriate tool calls to create the design.

**User Prompt:** "${prompt}"`,
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
