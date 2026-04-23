import path from "node:path";
import { Agent } from "@mastra/core/agent";
import {
  LocalFilesystem,
  LocalSandbox,
  Workspace,
} from "@mastra/core/workspace";
import { Memory } from "@mastra/memory";

const workshopDir = process.cwd();
const assistantWorkspaceDir = path.join(workshopDir, "assistant-workspace");

const workspace = new Workspace({
  name: "Workspace Agent Workspace",
  filesystem: new LocalFilesystem({
    basePath: workshopDir,
    allowedPaths: [assistantWorkspaceDir],
  }),
  sandbox: new LocalSandbox({
    workingDirectory: workshopDir,
  }),
});

export const workspaceAgent = new Agent({
  id: "workspace-agent",
  name: "Workspace Agent",
  description:
    "A workshop agent that demonstrates filesystem workspace access with memory.",
  instructions: `
You are the Workspace Agent for a workshop.

Your job is to demonstrate workspace and filesystem access.
- Use the workspace to inspect and edit files when the user asks.
- Read relevant files before modifying them.
- Keep changes focused on the request.
- Remember useful context from the conversation.
- Do not claim to have Gmail tools or browser access.
`,
  model: "openai/gpt-5.4",
  workspace,
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
