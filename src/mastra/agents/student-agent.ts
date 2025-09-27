import { google } from '@ai-sdk/google';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { writeGoogleDocTool, createGoogleDocTool } from '../tools/docs';  
import { GoogleVoice } from '@mastra/voice-google';

const voice = new GoogleVoice();

export const studentAgent = new Agent({
  name: 'Student Agent',
  instructions: `
      You're a helpful assistant that helps students with their questions and tasks regarding their studies and assignments.
      You are provided with tools to assist you in your tasks. Use them wisely to help the students effectively. Provide clear and concise answers.
      Always cite the sources of your information when applicable.
`,
  model: google('gemini-2.5-pro'),
  tools: { writeGoogleDocTool, createGoogleDocTool },
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
