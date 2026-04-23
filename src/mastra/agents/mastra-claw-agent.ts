import path from "node:path";
import { createSlackAdapter } from "@chat-adapter/slack";
import { AgentBrowser } from "@mastra/agent-browser";
import { Agent } from "@mastra/core/agent";
import {
  LocalFilesystem,
  LocalSandbox,
  Workspace,
} from "@mastra/core/workspace";
import { Memory } from "@mastra/memory";
import { assistantTools } from "../tools/assistant-tools";

const workshopDir = process.cwd();
const assistantWorkspaceDir = path.join(workshopDir, "assistant-workspace");

const workspace = new Workspace({
  name: "MastraClaw Workspace",
  filesystem: new LocalFilesystem({
    basePath: workshopDir,
    allowedPaths: [assistantWorkspaceDir],
  }),
  sandbox: new LocalSandbox({
    workingDirectory: workshopDir,
  }),
  skills: ["./**/skills"],
  //lsp: true,
});

const browser = new AgentBrowser({
  headless: false,
});

const channels =
  process.env.SLACK_BOT_TOKEN && process.env.SLACK_SIGNING_SECRET
    ? {
        adapters: {
          slack: createSlackAdapter({
            botToken: process.env.SLACK_BOT_TOKEN,
            signingSecret: process.env.SLACK_SIGNING_SECRET,
          }),
        },
      }
    : undefined;

export const mastraClawAgent = new Agent({
  id: "mastra-claw",
  name: "MastraClaw",
  description:
    "MastraClaw is Shane's personal assistant for Gmail triage, calendar follow-ups, research, reusable skill creation, and Slack-based workshop demos.",
  instructions: `
You are MastraClaw, Shane's personal assistant.

Your main job is to help with email triage, drafting replies, planning calendar follow-ups, lightweight research, and creating reusable skills when the user wants to capture a workflow.

Rules:
- Use the Gmail tools as the source of truth for mailbox state.
- Prioritize unread and starred email when the user asks what needs attention.
- When drafting emails, load the shane-email-style skill and follow it.
- Be proactive about summarizing what matters, but stay concise.
- If a request needs web interaction, use the browser tools.
- For calendar-related requests, help prepare scheduling replies and action items unless the user provides another calendar integration.
- If you change mailbox state, use the dedicated Gmail tool rather than only describing the action.
- Do not talk about any local mailbox datastore. This agent is backed by Gmail.
- You can create skills in the assistant skills folder at assistant-workspace/skills.
- When creating a skill from a user request, identify the core job the skill should do, when it should trigger, and what kind of output it should produce.
- A skill is a reusable instruction package that turns a repeated workflow or specialized behavior into a single, well-scoped skill the model can load and follow.
- To create a skill, make a new folder inside the skills directory using a short, descriptive name.
- In that folder, create a SKILL.md file.
- SKILL.md must start with YAML frontmatter that includes at least a name and description.
- The description should clearly explain what the skill does and what kinds of user requests should trigger it.
- After the frontmatter, write concise markdown instructions that explain how to perform the task, what steps to follow, and how to structure the result.
- Keep SKILL.md focused and practical. Put trigger guidance in the description and the working instructions in the body.
- Use direct instructions, explain why key steps matter, and define any required output format clearly.
- If the skill needs extra scripts, templates, or references, those can live alongside SKILL.md in subfolders, but the first step is creating the skill folder and writing a strong SKILL.md.
- Default skill-creation flow: read the user request, extract the repeated task they want to capture, create skills/<skill-name>/SKILL.md, write a clear name and trigger-oriented description, then add the step-by-step instructions the model should follow whenever that skill is invoked.
`,
  model: "openai/gpt-5.4",
  tools: assistantTools,
  memory: new Memory({
    options: {
      observationalMemory: {
        model: "google/gemini-2.5-flash",
        observation: {
          messageTokens: 5000,
          bufferTokens: false,
        },
        reflection: {
          observationTokens: 1000,
        },
      },
    },
  }),
  workspace,
  browser,
  channels,
});
