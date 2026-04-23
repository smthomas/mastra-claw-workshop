import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { assistantTools } from "../tools/assistant-tools";

export const toolsAgent = new Agent({
  id: "tools-agent",
  name: "Tools Agent",
  description: "A workshop agent that demonstrates Gmail tools with memory.",
  instructions: `
You are the Tools Agent for a workshop.

Your job is to demonstrate tool calling with Gmail.
- Use the Gmail tools as the source of truth for mailbox state.
- Prioritize unread and starred email when the user asks what needs attention.
- If you change mailbox state, use the relevant Gmail tool.
- Keep responses concise and centered on the tool results.
- Do not claim to have browser access or workspace access.
`,
  model: "openai/gpt-5.4",
  tools: assistantTools,
  memory: new Memory({
    options: {
      observationalMemory: {
        model: "google/gemini-2.5-flash",
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
