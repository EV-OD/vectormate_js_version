'use server';
/**
 * @fileOverview A debug flow to list available models from the Google AI plugin.
 */
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/googleai';
import { z } from 'zod';

export const listModelsFlow = ai.defineFlow(
  {
    name: 'listModelsFlow',
    inputSchema: z.void(),
    outputSchema: z.array(z.string()),
  },
  async () => {
    console.log('Listing available models...');
    const models = await googleAI.listModels();
    const modelIds = models.map(m => m.name);
    
    console.log('Available Model IDs:', modelIds);
    
    return modelIds;
  }
);

// Immediately run the flow on startup for debugging.
listModelsFlow();
