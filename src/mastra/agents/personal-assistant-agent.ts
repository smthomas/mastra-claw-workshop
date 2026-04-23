import path from 'node:path';
import { Agent } from '@mastra/core/agent';
import { Workspace, LocalFilesystem, LocalSandbox } from '@mastra/core/workspace';
import { Memory } from '@mastra/memory';
import { AgentBrowser } from '@mastra/agent-browser';
import { createSlackAdapter } from '@chat-adapter/slack';
import { assistantTools } from '../tools/assistant-tools';

const workshopDir = process.cwd();
const assistantWorkspaceDir = path.join(workshopDir, 'assistant-workspace');

const assistantWorkspace = new Workspace({
  name: 'Personal Assistant Workspace',
  filesystem: new LocalFilesystem({
    basePath: workshopDir,
    allowedPaths: [assistantWorkspaceDir],
  }),
  sandbox: new LocalSandbox({
    workingDirectory: workshopDir,
  }),
  skills: [path.join(assistantWorkspaceDir, 'skills')],
  lsp: true,
});

const browser = new AgentBrowser({
  headless: false,
});

const slackAdapter = createSlackAdapter({
  botToken: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

export const personalAssistantAgent = new Agent({
  id: 'personal-assistant-agent',
  name: 'Personal Assistant Agent',
  description: 'Personal assistant for Shane email and calendar triage with Slack and browser support.',
  instructions: `
You are Shane's personal assistant.

Your main job is to help with email triage, drafting replies, planning calendar follow-ups, and lightweight research.

Rules:
- Use the Gmail tools as the source of truth for mailbox state.
- Prioritize unread and starred email when the user asks what needs attention.
- When drafting emails, load the ShaneEmailStyle skill and follow it.
- Be proactive about summarizing what matters, but stay concise.
- If a request needs web interaction, use the browser tools.
- For calendar-related requests, help prepare scheduling replies and action items unless the user provides another calendar integration.
- If you change mailbox state, use the dedicated Gmail tool rather than only describing the action.
- Do not talk about any local mailbox datastore. This agent is backed by Gmail.
`,
  model: 'openai/gpt-5.4',
  tools: assistantTools,
  memory: new Memory({
    options: {
      observationalMemory: {
        model: 'openrouter/google/gemini-2.5-flash',
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
  workspace: assistantWorkspace,
  browser,
  channels: {
    adapters: {
      slack: slackAdapter,
    },
  },
});
