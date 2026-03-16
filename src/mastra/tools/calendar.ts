import { google } from 'googleapis';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getGoogleAuth } from './auth';

const createEventInput = z.object({
  title: z.string().describe('Title/summary of the calendar event'),
  description: z.string().optional().describe('Detailed description of the event'),
  startDateTime: z.string().describe('Start date and time in ISO 8601 format (e.g. 2026-05-03T10:00:00+05:30)'),
  endDateTime: z.string().describe('End date and time in ISO 8601 format (e.g. 2026-05-03T11:00:00+05:30)'),
  reminderMinutes: z.number().default(30).describe('How many minutes before the event to send a reminder (default: 30)'),
});

export const createCalendarEventTool = createTool({
  id: 'createCalendarEvent',
  description: 'Creates a new event on the user\'s Google Calendar with a reminder. Use this to set reminders, schedule tasks, or add events.',
  inputSchema: createEventInput,
  execute: async ({ title, description, startDateTime, endDateTime, reminderMinutes }) => {
    const auth = await getGoogleAuth();
    const calendar = google.calendar({ version: 'v3', auth });

    const event = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: title,
        description: description || '',
        start: {
          dateTime: startDateTime,
        },
        end: {
          dateTime: endDateTime,
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: reminderMinutes },
          ],
        },
      },
    });

    return {
      success: true,
      message: `Event "${title}" created successfully`,
      eventId: event.data.id,
      url: event.data.htmlLink,
      start: event.data.start?.dateTime,
      end: event.data.end?.dateTime,
    };
  },
});

const listEventsInput = z.object({
  maxResults: z.number().default(10).describe('Maximum number of upcoming events to return (default: 10)'),
});

export const listCalendarEventsTool = createTool({
  id: 'listCalendarEvents',
  description: 'Lists upcoming events from the user\'s Google Calendar. Use this to check the schedule or find existing events.',
  inputSchema: listEventsInput,
  execute: async ({ maxResults }) => {
    const auth = await getGoogleAuth();
    const calendar = google.calendar({ version: 'v3', auth });

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: new Date().toISOString(),
      maxResults,
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = res.data.items || [];

    if (events.length === 0) {
      return { success: true, message: 'No upcoming events found.', events: [] };
    }

    return {
      success: true,
      message: `Found ${events.length} upcoming event(s).`,
      events: events.map((event) => ({
        title: event.summary,
        start: event.start?.dateTime || event.start?.date,
        end: event.end?.dateTime || event.end?.date,
        description: event.description || '',
        url: event.htmlLink,
      })),
    };
  },
});
