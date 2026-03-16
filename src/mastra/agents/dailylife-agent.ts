import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { Agent } from '@mastra/core/agent';
import { Memory } from '@mastra/memory';
import { LibSQLStore } from '@mastra/libsql';
import { createCalendarEventTool, listCalendarEventsTool } from '../tools/calendar';
import { getCurrentWeatherTool, getWeatherForecastTool } from '../tools/weather';

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

export const dailyLifeAgent = new Agent({
  id: 'dailylife-agent',
  name: 'Daily Life Agent',
  instructions: () => {
    const now = new Date();
    const currentDateTime = now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' });
    const isoNow = now.toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace(' ', 'T') + '+05:30';

    return `
      You're a helpful daily life assistant that helps users manage their schedule, set reminders, check weather, and stay organized.
      You can create events on Google Calendar, check the schedule, and fetch real-time weather data.

      IMPORTANT — The current date and time is: ${currentDateTime} (ISO: ${isoNow}).
      Use this as reference for all date/time calculations. Do NOT guess the year — it is ${now.getFullYear()}.

      CALENDAR RULES:
      - Parse the date, time, and duration from the user's message.
      - Use the current date/time above as reference if they say "today", "tomorrow", "in 2 hours", etc.
      - Default to a 30-minute event if no duration is specified.
      - Default to a 30-minute reminder before the event unless they specify otherwise.
      - Always use the user's timezone (Asia/Kolkata, +05:30) for date/time values.
      - Call the createCalendarEvent tool directly — do NOT ask the user to provide ISO timestamps.

      WEATHER RULES:
      - When the user asks about weather, use getCurrentWeather for current conditions or getWeatherForecast for multi-day forecasts.
      - When the user mentions planning a trip, outing, picnic, travel, or any outdoor activity:
        1. First fetch the weather forecast for that location and date range.
        2. If the weather looks bad (rain, thunderstorms, heavy wind, extreme heat above 40°C), proactively WARN the user.
        3. Look at the forecast and SUGGEST better days with clearer weather for their trip.
        4. If all days look bad, say so honestly and recommend indoor alternatives or postponing.
      - When giving weather info, mention temperature, conditions, and rain chance clearly.

      When the user asks about their schedule, use the listCalendarEvents tool to show upcoming events.

      Be friendly, concise, and proactive. Confirm the event details after creation.
    `;
  },
  model: openrouter('google/gemini-2.5-flash'),
  tools: { createCalendarEventTool, listCalendarEventsTool, getCurrentWeatherTool, getWeatherForecastTool },
  memory: new Memory({
    storage: new LibSQLStore({
      id: 'dailylife-agent-memory',
      url: 'file:../mastra.db',
    }),
    options: {
      workingMemory: {
        enabled: false,
      },
    }
  }),
});
