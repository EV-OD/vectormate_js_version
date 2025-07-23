/**
 * @fileOverview Defines and exports high-level AI tools for drawing UI components.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { type Shape, TextShape, RectangleShape, PathShape } from '@/lib/types';
import { getTextDimensions } from '@/lib/geometry';
import { 
    generatedShapes, 
    drawRectangleTool, 
    drawTextTool, 
    RectangleShapeSchema, 
    TextShapeSchema,
    PathShapeSchema
} from './drawing-tools';

// --- Label Tool (Preset) ---
const LabelParamsSchema = z.object({
  text: z.string().describe('The text content of the label.'),
  x: z.number().describe("The label's top-left x-coordinate."),
  y: z.number().describe("The label's top-left y-coordinate."),
  fontSize: z.number().optional().default(14).describe('The font size.'),
});

export const drawLabelTool = ai.defineTool(
  {
    name: 'drawLabel',
    description: 'Draws a text label, typically used to identify a nearby UI element like an input field.',
    inputSchema: LabelParamsSchema,
    outputSchema: TextShapeSchema,
  },
  async (params): Promise<z.infer<typeof TextShapeSchema>> => {
    console.log('[drawLabelTool input]', params);
    const { width, height } = getTextDimensions(params.text, params.fontSize, 'Inter', 'normal');
    const newShape: TextShape = {
      id: nanoid(),
      type: 'text',
      name: 'Label',
      x: params.x,
      y: params.y,
      width,
      height,
      rotation: 0,
      opacity: 1,
      text: params.text,
      fontSize: params.fontSize,
      fontFamily: 'Inter',
      fontWeight: 'normal',
      fill: '#eeeeee',
    };
    generatedShapes.push(newShape);
    return newShape;
  }
);


// --- Button Tool (Preset) ---
const ButtonParamsSchema = z.object({
    x: z.number().describe("The x-coordinate of the button's top-left corner."),
    y: z.number().describe("The y-coordinate of the button's top-left corner."),
    width: z.number().optional().default(150).describe("The width of the button."),
    height: z.number().optional().default(50).describe("The height of the button."),
    text: z.string().describe("The text label for the button."),
    backgroundColor: z.string().optional().describe("The background color of the button in hex format."),
    textColor: z.string().optional().describe("The text color in hex format."),
});

const ButtonOutputSchema = z.object({
    buttonRectangle: RectangleShapeSchema,
    buttonText: TextShapeSchema,
});

export const drawButtonTool = ai.defineTool(
  {
    name: 'drawButton',
    description: 'Draws a complete button with a background rectangle and centered text. This is a preset tool.',
    inputSchema: ButtonParamsSchema,
    outputSchema: ButtonOutputSchema,
  },
  async (params): Promise<z.infer<typeof ButtonOutputSchema>> => {
    console.log('[drawButtonTool input]', params);

    // 1. Create the button rectangle
    const buttonRectangle: RectangleShape = {
      id: nanoid(),
      type: 'rectangle',
      name: `${params.text} Button`,
      x: params.x,
      y: params.y,
      width: params.width,
      height: params.height,
      rotation: 0,
      opacity: 1,
      fill: params.backgroundColor ?? "#007bff",
      fillOpacity: 1,
      strokeOpacity: 1,
      borderRadius: 8, // Default rounded corners for buttons
    };
    generatedShapes.push(buttonRectangle);

    // 2. Create the button text
    const fontSize = Math.min(params.height * 0.4, params.width / params.text.length * 1.5);
    const { width: textWidth, height: textHeight } = getTextDimensions(params.text, fontSize, 'Inter', 'bold');

    const textX = params.x + (params.width - textWidth) / 2;
    const textY = params.y + (params.height - textHeight) / 2;

    const buttonText: TextShape = {
      id: nanoid(),
      type: 'text',
      name: `${params.text} Label`,
      x: textX,
      y: textY,
      width: textWidth,
      height: textHeight,
      rotation: 0,
      opacity: 1,
      text: params.text,
      fontSize,
      fontFamily: 'Inter',
      fontWeight: 'bold',
      fill: params.textColor ?? "#ffffff",
    };
    generatedShapes.push(buttonText);
    
    return { buttonRectangle, buttonText };
  }
);


// --- Input Box Tool (Preset) ---
const InputBoxParamsSchema = z.object({
    x: z.number().describe("The x-coordinate of the input box's top-left corner."),
    y: z.number().describe("The y-coordinate of the input box's top-left corner."),
    width: z.number().optional().default(250).describe("The width of the input box."),
    height: z.number().optional().default(40).describe("The height of the input box."),
    placeholderText: z.string().optional().describe("The placeholder text for the input."),
    backgroundColor: z.string().optional().describe("The background color in hex format."),
    borderColor: z.string().optional().default("#555555").describe("The border color in hex format."),
});

export const drawInputBoxTool = ai.defineTool(
  {
    name: 'drawInputBox',
    description: 'Draws a styled input box, optionally with placeholder text.',
    inputSchema: InputBoxParamsSchema,
    outputSchema: z.object({
        inputRectangle: RectangleShapeSchema,
        inputText: TextShapeSchema.optional(),
    }),
  },
  async (params) => {
    console.log('[drawInputBoxTool input]', params);

    const inputBox: RectangleShape = {
      id: nanoid(),
      type: 'rectangle',
      name: 'Input Box',
      x: params.x,
      y: params.y,
      width: params.width,
      height: params.height,
      rotation: 0,
      opacity: 1,
      fill: params.backgroundColor ?? '#333333',
      stroke: params.borderColor,
      strokeWidth: 1,
      fillOpacity: 1,
      strokeOpacity: 1,
      borderRadius: 6,
    };
    generatedShapes.push(inputBox);

    let placeholderShape: TextShape | undefined;
    if (params.placeholderText) {
        const fontSize = params.height * 0.4;
        const { width: textWidth, height: textHeight } = getTextDimensions(params.placeholderText, fontSize, 'Inter', 'normal');
        
        placeholderShape = {
            id: nanoid(),
            type: 'text',
            name: 'Placeholder',
            x: params.x + 10, // Padding
            y: params.y + (params.height - textHeight) / 2,
            width: textWidth,
            height: textHeight,
            rotation: 0,
            opacity: 0.6,
            text: params.placeholderText,
            fontSize,
            fontFamily: 'Inter',
            fontWeight: 'normal',
            fill: '#ffffff',
        };
        generatedShapes.push(placeholderShape);
    }
    
    return { inputRectangle: inputBox, inputText: placeholderShape };
  }
);


// --- Checkbox Tool (Preset) ---
const CheckboxParamsSchema = z.object({
    x: z.number().describe("The x-coordinate of the checkbox's top-left corner."),
    y: z.number().describe("The y-coordinate of the checkbox's top-left corner."),
    label: z.string().optional().describe("The text label for the checkbox."),
    checked: z.boolean().optional().default(false).describe("Whether the checkbox is checked."),
    size: z.number().optional().default(20).describe("The size of the checkbox square."),
});

export const drawCheckboxTool = ai.defineTool(
  {
    name: 'drawCheckbox',
    description: 'Draws a checkbox with an optional label and checked state.',
    inputSchema: CheckboxParamsSchema,
    outputSchema: z.object({
        box: RectangleShapeSchema,
        label: TextShapeSchema.optional(),
        checkmark: PathShapeSchema.optional(),
    }),
  },
  async (params) => {
    console.log('[drawCheckboxTool input]', params);

    const box: RectangleShape = {
      id: nanoid(),
      type: 'rectangle',
      name: 'Checkbox',
      x: params.x,
      y: params.y,
      width: params.size,
      height: params.size,
      rotation: 0,
      opacity: 1,
      fill: '#333333',
      stroke: '#555555',
      strokeWidth: 1,
      borderRadius: 4,
      fillOpacity: 1,
      strokeOpacity: 1,
    };
    generatedShapes.push(box);

    let checkmark: PathShape | undefined;
    if (params.checked) {
        const checkPath = `M ${params.size * 0.2} ${params.size * 0.5} L ${params.size * 0.4} ${params.size * 0.7} L ${params.size * 0.8} ${params.size * 0.3}`;
        checkmark = {
            id: nanoid(),
            type: 'path',
            name: 'Checkmark',
            x: params.x,
            y: params.y,
            width: params.size,
            height: params.size,
            rotation: 0,
            opacity: 1,
            fill: 'none',
            stroke: '#ffffff',
            strokeWidth: 2,
            d: checkPath,
        };
        generatedShapes.push(checkmark);
    }
    
    let labelShape: TextShape | undefined;
    if (params.label) {
        const fontSize = params.size * 0.8;
        const { width: textWidth, height: textHeight } = getTextDimensions(params.label, fontSize, 'Inter', 'normal');
        
        labelShape = {
            id: nanoid(),
            type: 'text',
            name: 'Checkbox Label',
            x: params.x + params.size + 8, // padding
            y: params.y + (params.size - textHeight) / 2,
            width: textWidth,
            height: textHeight,
            rotation: 0,
            opacity: 1,
            text: params.label,
            fontSize,
            fontFamily: 'Inter',
            fontWeight: 'normal',
            fill: '#ffffff',
        };
        generatedShapes.push(labelShape);
    }

    return { box, label: labelShape, checkmark };
  }
);

// --- Select Dropdown Tool (Preset) ---
const SelectDropdownParamsSchema = z.object({
    x: z.number().describe("The x-coordinate of the select dropdown's top-left corner."),
    y: z.number().describe("The y-coordinate of the select dropdown's top-left corner."),
    width: z.number().optional().default(200).describe("The width of the dropdown."),
    height: z.number().optional().default(40).describe("The height of the dropdown."),
    text: z.string().describe("The currently selected value text to display."),
});

export const drawSelectDropdownTool = ai.defineTool(
  {
    name: 'drawSelectDropdown',
    description: 'Draws a select dropdown component with text and a chevron.',
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
        width: params.width,
        height: params.height,
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
    
    const fontSize = params.height * 0.4;
    const { width: textWidth, height: textHeight } = getTextDimensions(params.text, fontSize, 'Inter', 'normal');
    
    const textShape: TextShape = {
        id: nanoid(),
        type: 'text',
        name: 'Select Text',
        x: params.x + 10,
        y: params.y + (params.height - textHeight) / 2,
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
    
    const chevronSize = params.height * 0.3;
    const chevronPath = `M 0 0 L ${chevronSize / 2} ${chevronSize / 2} L ${chevronSize} 0`;
    const chevron: PathShape = {
        id: nanoid(),
        type: 'path',
        name: 'Chevron',
        x: params.x + params.width - chevronSize - 10,
        y: params.y + (params.height - chevronSize / 2) / 2,
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


// --- Card Tool (Preset) ---
const CardParamsSchema = z.object({
  x: z.number().describe("The card's top-left x-coordinate."),
  y: z.number().describe("The card's top-left y-coordinate."),
  width: z.number().optional().default(300).describe('The width of the card.'),
  height: z.number().optional().default(200).describe('The height of the card.'),
  backgroundColor: z.string().optional().describe('The background color of the card.'),
  borderRadius: z.number().optional().default(12).describe('The corner radius of the card.'),
  title: z.string().optional().describe('An optional title to display at the top of the card.'),
});

export const drawCardTool = ai.defineTool(
  {
    name: 'drawCard',
    description: 'Draws a card element, which is a container for other content. Can optionally include a title.',
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
      width: params.width,
      height: params.height,
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
      const { width: textWidth, height: textHeight } = getTextDimensions(params.title, fontSize, 'Inter', 'bold');
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


// --- Form Tool (Meta-Tool) ---
const FormParamsSchema = z.object({
  x: z.number().describe("The form container's top-left x-coordinate."),
  y: z.number().describe("The form container's top-left y-coordinate."),
  width: z.number().optional().default(350).describe("The width of the form."),
  title: z.string().describe("The title of the form, like 'Login' or 'Sign Up'."),
  inputs: z.array(z.object({
    label: z.string().describe("The label for the input field (e.g., 'Username', 'Password')."),
    placeholder: z.string().optional().describe("The placeholder text for the input field."),
  })).describe("An array of input fields to include in the form."),
  buttonText: z.string().describe("The text for the submit button (e.g., 'Log In', 'Create Account')."),
});

export const drawFormTool = ai.defineTool(
  {
    name: 'drawForm',
    description: 'Draws a complete UI form, including a title, input fields with labels, and a submit button. This is a high-level component tool.',
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

    let currentY = params.y + PADDING;

    const { width: titleWidth, height: titleHeight } = getTextDimensions(params.title, TITLE_FONT_SIZE, 'Inter', 'bold');
    const titleShape = await drawTextTool({
      text: params.title,
      x: params.x + (params.width - titleWidth) / 2,
      y: currentY,
      fontSize: TITLE_FONT_SIZE,
      fontWeight: 'bold',
      fill: '#ffffff',
    });
    currentY += titleHeight + GAP_TITLE_INPUT;

    for (const input of params.inputs) {
      const { height: labelHeight } = getTextDimensions(input.label, LABEL_FONT_SIZE, 'Inter', 'normal');
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
        width: params.width - (PADDING * 2),
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
      width: params.width - (PADDING * 2),
      height: BUTTON_HEIGHT,
      text: params.buttonText,
    });
    currentY += BUTTON_HEIGHT;
    
    const totalHeight = currentY - params.y + PADDING;
    const cardShape = await drawCardTool({
        x: params.x,
        y: params.y,
        width: params.width,
        height: totalHeight,
        title: '',
    });
    
    const cardIndex = generatedShapes.findIndex(s => s.id === cardShape.cardRectangle.id);
    if (cardIndex > -1) {
        const [cardToMove] = generatedShapes.splice(cardIndex, 1);
        generatedShapes.unshift(cardToMove);
    }
    
    return { card: cardShape.cardRectangle, title: titleShape };
  }
);
