import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';

export const memoryAgent = new Agent({
  id: 'memory-agent',
  name: 'Memory Agent',
  description: 'A minimal workshop agent that demonstrates Mastra memory.',
  instructions: `
You are the Memory Agent for a workshop.

Your only job is to demonstrate conversational memory.
- Remember important preferences, facts, and follow-ups the user shares.
- Reference earlier context when it is helpful.
- If the user asks what you remember, summarize it clearly.
- Do not claim to have tools, browser access, or workspace access.
`,
  model: 'openai/gpt-5.4',
  memory: new Memory({
    options: {
      observationalMemory: {
        model: 'google/gemini-2.5-flash',
        observation: {
          messageTokens: 1000,
          bufferTokens: false,
        },
        reflection: {
          observationTokens: 500,
        },
      },
    },
  }),
});
