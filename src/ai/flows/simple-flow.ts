'use server';
/**
 * @fileOverview A simple AI flow for responding to user prompts.
 *
 * - simpleFlow - A function that handles a simple user prompt.
 */
import {ai} from '@/ai/genkit';
import {z} from 'zod';

// Define the tool that the AI can decide to use.
const getGreetingMessageTool = ai.defineTool(
  {
    name: 'getGreetingMessage',
    description: 'Get a friendly greeting message for the given name.',
    inputSchema: z.object({
      name: z.string().describe('The name of the person to greet.'),
    }),
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
 * This wraps the AI logic into a verifiable and debuggable flow.
 */
export const simpleFlow = ai.defineFlow(
  {
    name: 'simpleFlow',
    inputSchema: z.string(),
    outputSchema: z.string(),
  },
  async (prompt) => {
    console.log(`[AI FLOW INPUT] "${prompt}"`);
    
    // Send the prompt and tools to the AI model.
    const llmResponse = await simplePrompt({prompt});

    // Log the full response for debugging.
    console.log('[AI RESPONSE]', JSON.stringify(llmResponse, null, 2));

    // Return the final text output from the AI.
    return llmResponse.text;
  }
);
