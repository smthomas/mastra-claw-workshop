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
  name: "Skills Agent Workspace",
  filesystem: new LocalFilesystem({
    basePath: workshopDir,
    allowedPaths: [assistantWorkspaceDir],
  }),
  sandbox: new LocalSandbox({
    workingDirectory: workshopDir,
  }),
  skills: ["./**/skills"],
});

export const skillsAgent = new Agent({
  id: "skills-agent",
  name: "Skills Agent",
  description:
    "A workshop agent that demonstrates workspace skills with memory.",
  instructions: `
You are the Skills Agent for a workshop.

Your job is to demonstrate reusable skills.
- Load and follow skills from the workspace when they fit the user's request.
- You can create skills in assistant-workspace/skills when the user wants to capture a repeated workflow.
- A new skill should live in skills/<skill-name>/SKILL.md with YAML frontmatter that includes at least a name and description.
- The description should explain what the skill does and what requests should trigger it.
- The body should contain concise markdown instructions for how to do the task and structure the result.
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
