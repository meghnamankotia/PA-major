import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { writeGoogleDocTool, createGoogleDocTool } from '../tools/docs';
import { generateMindMap } from '../tools/maps';
import { podcastTool } from '../tools/pods';


// OpenAI-compatible provider pointed at OpenRouter, with max_tokens enforced
const openrouter = createOpenAICompatible({
  name: 'openrouter',
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  // Inject max_tokens into every request so OpenRouter doesn't default to 65535
  transformRequestBody: (body) => ({
    ...body,
    max_tokens: body.max_tokens ?? 8192,
  }),
});

export const studentAgent = new Agent({
  id: 'student-agent',
  name: 'Student Agent',
  instructions: `
      You're a helpful assistant that helps students with their questions and tasks regarding their studies and assignments.
      You are provided with tools to assist you in your tasks. Use them wisely to help the students effectively. Provide clear and concise answers.
      Always cite the sources of your information when applicable.

      When the user asks you to create a podcast on a topic, you MUST generate the full podcast script yourself — do NOT ask the user to provide a script.
      Write an engaging, informative Host/Guest dialogue and then call the podcastTool with that script.
      Keep podcast scripts concise — aim for 8 to 12 lines of dialogue so generation completes quickly.
      Similarly, when asked to generate a mind map, create the Mermaid mind map syntax yourself and call the tool directly.
`,
  model: openrouter('google/gemini-2.5-flash'),
  tools: { writeGoogleDocTool, createGoogleDocTool, generateMindMap, podcastTool },
  memory: new Memory({
    storage: new LibSQLStore({
      id: 'student-agent-memory',
      url: 'file:../mastra.db',
    }),
    options: {
      workingMemory: {
        enabled: false,
      },
    }
  }),

});
