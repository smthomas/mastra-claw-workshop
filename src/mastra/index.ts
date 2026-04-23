import { Mastra } from '@mastra/core/mastra';
import { MastraCompositeStore } from '@mastra/core/storage';
import { DuckDBStore } from '@mastra/duckdb';
import { LibSQLStore } from '@mastra/libsql';
import { PinoLogger } from '@mastra/loggers';
import { CloudExporter, DefaultExporter, Observability, SensitiveDataFilter } from '@mastra/observability';
import { browserAgent } from './agents/browser-agent';
import { mastraClawAgent } from './agents/mastra-claw-agent';
import { memoryAgent } from './agents/memory-agent';
import { skillsAgent } from './agents/skills-agent';
import { toolsAgent } from './agents/tools-agent';
import { weatherAgent } from './agents/weather-agent';
import { workspaceAgent } from './agents/workspace-agent';
import { toolCallAppropriatenessScorer, completenessScorer, translationScorer } from './scorers/weather-scorer';
import { weatherWorkflow } from './workflows/weather-workflow';

export const mastra = new Mastra({
  workflows: { weatherWorkflow },
  agents: {
    weatherAgent,
    memoryAgent,
    toolsAgent,
    browserAgent,
    workspaceAgent,
    skillsAgent,
    mastraClawAgent,
  },
  scorers: { toolCallAppropriatenessScorer, completenessScorer, translationScorer },
  storage: new MastraCompositeStore({
    id: 'composite-storage',
    default: new LibSQLStore({
      id: 'mastra-storage',
      url: 'file:./mastra.db',
    }),
    domains: {
      observability: await new DuckDBStore().getStore('observability'),
    },
  }),
  logger: new PinoLogger({
    name: 'Mastra',
    level: 'info',
  }),
  observability: new Observability({
    configs: {
      default: {
        serviceName: 'mastra',
        exporters: [
          new DefaultExporter(),
          new CloudExporter(),
        ],
        spanOutputProcessors: [new SensitiveDataFilter()],
      },
    },
  }),
});
