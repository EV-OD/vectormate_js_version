import { ai } from '@/ai/genkit';
import { z } from 'zod';
import {
  drawRectangleTool,
  drawCircleTool,
  drawLineTool,
  drawTextTool,
} from '../../drawing';
import { drawButtonTool } from '../button';
import { drawInputBoxTool } from '../input';
import { drawCheckboxTool } from '../checkbox';
import { drawSelectDropdownTool } from '../select';
import { drawLabelTool } from '../label';
import { drawCardTool } from '../card';
import { drawFormTool } from '../form';
import { drawFrameTool } from '../frame';

// A map of all tools that can be called by the grid layout tool.
const availableTools: { [key: string]: any } = {
  drawRectangle: drawRectangleTool,
  drawCircleOrEllipse: drawCircleTool,
  drawLine: drawLineTool,
  drawText: drawTextTool,
  drawButton: drawButtonTool,
  drawInputBox: drawInputBoxTool,
  drawCheckbox: drawCheckboxTool,
  drawSelectDropdown: drawSelectDropdownTool,
  drawLabel: drawLabelTool,
  drawCard: drawCardTool,
  drawForm: drawFormTool,
  drawFrame: drawFrameTool,
  drawGridLayout: (...args: any[]) => drawGridLayoutTool(...args), // Add self-reference
};

const ToolCallSchema = z.object({
  toolName: z.string().describe('The name of the tool to call, e.g., "drawButton".'),
  params: z.record(z.any()).describe('The parameters object to pass to the tool.'),
});

const GridLayoutToolParamsSchema = z.object({
  x: z.number().describe('The top-left x-coordinate of the grid container.'),
  y: z.number().describe('The top-left y-coordinate of the grid container.'),
  columns: z.number().min(1).describe('The number of columns in the grid.'),
  rows: z.number().min(1).describe('The number of rows in the grid.'),
  width: z.number().describe('The total width of the grid.'),
  height: z.number().describe('The total height of the grid.'),
  gap: z.number().default(10).describe('The spacing between grid cells.'),
  items: z
    .string()
    .describe(
      'A JSON string representing an array of tool calls to place in the grid. Example: `[{"toolName": "drawButton", "params": {"text": "Cell 1"}}, {"toolName": "drawRectangle", "params": {}}]`'
    ),
});

export const drawGridLayoutTool = ai.defineTool(
  {
    name: 'drawGridLayout',
    description: 'Draws a grid layout and populates its cells by calling other drawing tools. Can be nested.',
    inputSchema: GridLayoutToolParamsSchema,
    outputSchema: z.object({
      success: z.boolean(),
      cellsPopulated: z.number(),
    }),
  },
  async (params) => {
    console.log('[drawGridLayoutTool input]', params);

    let parsedItems: z.infer<typeof ToolCallSchema>[];
    try {
      parsedItems = JSON.parse(params.items);
    } catch (e) {
      console.error('Failed to parse grid layout items JSON:', e);
      throw new Error('Invalid JSON string for grid items.');
    }

    const { x, y, width, height, columns, rows, gap } = params;

    const cellWidth = (width - gap * (columns - 1)) / columns;
    const cellHeight = (height - gap * (rows - 1)) / rows;
    let itemsPlaced = 0;

    for (let i = 0; i < parsedItems.length; i++) {
      if (itemsPlaced >= columns * rows) break;

      const item = parsedItems[i];
      const toolToCall = availableTools[item.toolName];

      if (!toolToCall) {
        console.warn(`Grid layout: Tool "${item.toolName}" not found.`);
        continue;
      }

      const rowIndex = Math.floor(i / columns);
      const colIndex = i % columns;

      const cellX = x + colIndex * (cellWidth + gap);
      const cellY = y + rowIndex * (cellHeight + gap);

      const toolParams = {
        ...item.params,
        x: cellX,
        y: cellY,
        width: item.params.width ?? cellWidth,
        height: item.params.height ?? cellHeight,
      };

      try {
        await toolToCall(toolParams);
        itemsPlaced++;
      } catch (e) {
        console.error(`Error executing tool "${item.toolName}" in grid:`, e);
      }
    }

    return { success: true, cellsPopulated: itemsPlaced };
  }
);
