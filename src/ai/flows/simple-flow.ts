'use server';
/**
 * @fileOverview A simple AI flow for responding to user prompts.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';

// Define the input schema for our tool.
const GreetingMessageInputSchema = z.object({
  name: z.string().describe('The name of the person to greet.'),
});

// Define the tool that the AI can decide to use.
const getGreetingMessageTool = ai.defineTool(
  {
    name: 'getGreetingMessage',
    description: 'Get a friendly greeting message for the given name.',
    inputSchema: GreetingMessageInputSchema,
    outputSchema: z.string(),
  },
  async ({name}) => {
    return `Hello, ${name}! Welcome to VectorMate.`;
  }
);

// Define the prompt that will be sent to the AI.
// We provide it with the tool we defined above.
const simplePrompt = ai.definePrompt({
  name: 'simplePrompt',
  system: 'You are a friendly assistant in a vector editor app. Greet the user if they provide their name.',
  tools: [getGreetingMessageTool],
});

/**
 * The main flow function that the client will call.
 * @param prompt - The user's text prompt.
 * @returns The AI's final text response.
 */
export async function simpleFlow(prompt: string): Promise<string> {
  console.log(`[AI PROMPT] Sending: "${prompt}"`);

  // Send the prompt and tools to the AI model.
  const llmResponse = await simplePrompt({prompt});

  // Log the full response for debugging.
  console.log('[AI RESPONSE]', JSON.stringify(llmResponse, null, 2));

  // Return the final text output from the AI.
  return llmResponse.text;
}
