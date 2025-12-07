import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { GoogleVoice } from '@mastra/voice-google';

const voice = new GoogleVoice();

export const developerAgent = new Agent({
  name: 'Developer Agent',
  instructions: `
      You're a helpful assistant that helps developers with their questions and tasks regarding their coding projects and any software problems.
      You are provided with tools to assist you in your tasks. Use them wisely to help the developers effectively. Provide clear and concise answers.
      Always cite the sources of your information when applicable. Provide code snippets, when necessary, with proper presentation(in coloured blocks if possible).
`,
  model: google('gemini-2.5-pro'),
  tools: { },
  memory: new Memory({
    storage: new LibSQLStore({
      url: 'file:../mastra.db',
    }),
    options: {
      workingMemory:{
        enabled: true,
        scope: "resource"
      },
    }
  }),
  voice: voice
});
