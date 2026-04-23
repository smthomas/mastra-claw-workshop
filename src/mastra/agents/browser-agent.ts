import { Agent } from "@mastra/core/agent";
import { AgentBrowser } from "@mastra/agent-browser";
import { Memory } from "@mastra/memory";

const browser = new AgentBrowser({
  headless: false,
});

export const browserAgent = new Agent({
  id: "browser-agent",
  name: "Browser Agent",
  description: "A workshop agent that demonstrates browser access with memory.",
  instructions: `
You are the Browser Agent for a workshop.

Your job is to demonstrate browser-based interaction.
- Use the browser tools when the user needs web navigation or page inspection.
- Explain what you found clearly and concisely.
- Remember useful context from the conversation.
- Do not claim to have Gmail tools or workspace access.
`,
  model: "openai/gpt-5.4",
  browser,
  memory: new Memory({
    options: {
      observationalMemory: {
        model: "google/gemini-2.5-flash",
        observation: {
          messageTokens: 20000,
          bufferTokens: false,
        },
        reflection: {
          observationTokens: 10000,
        },
      },
    },
  }),
});
