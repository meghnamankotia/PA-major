import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

/**
 * Decode HTML entities commonly found in Stack Exchange API responses.
 */
function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&ndash;/g, '–')
    .replace(/&mdash;/g, '—');
}

/**
 * Strip HTML tags from a string to produce plain text.
 */
function stripHtml(html: string): string {
  return html
    .replace(/<code>/g, '`')
    .replace(/<\/code>/g, '`')
    .replace(/<pre[^>]*>/g, '\n```\n')
    .replace(/<\/pre>/g, '\n```\n')
    .replace(/<br\s*\/?>/g, '\n')
    .replace(/<li>/g, '• ')
    .replace(/<\/li>/g, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Truncate text to a maximum length, appending "..." if truncated.
 */
function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

interface StackExchangeQuestion {
  question_id: number;
  title: string;
  link: string;
  score: number;
  answer_count: number;
  is_answered: boolean;
  tags: string[];
  accepted_answer_id?: number;
}

interface StackExchangeAnswer {
  answer_id: number;
  question_id: number;
  score: number;
  is_accepted: boolean;
  body: string;
}

const searchInput = z.object({
  query: z.string().describe('The programming question, error message, or topic to search for on Stack Overflow'),
  tags: z.string().optional().describe('Comma-separated tags to filter by (e.g. "javascript,react"). Optional.'),
  maxResults: z.number().default(3).describe('Number of results to return (1-5, default: 3)'),
});

export const searchStackOverflowTool = createTool({
  id: 'searchStackOverflow',
  description: 'Search Stack Overflow for programming questions and get top/accepted answers. Use this when users have coding questions, error messages, or need help with programming concepts.',
  inputSchema: searchInput,
  execute: async ({ query, tags, maxResults }) => {
    const resultCount = Math.min(Math.max(maxResults, 1), 5);

    try {
      // Step 1: Search for relevant questions
      const searchParams = new URLSearchParams({
        order: 'desc',
        sort: 'relevance',
        q: query,
        site: 'stackoverflow',
        filter: 'default',
        pagesize: String(resultCount),
      });

      if (tags) {
        searchParams.set('tagged', tags);
      }

      const searchRes = await fetch(`https://api.stackexchange.com/2.3/search/advanced?${searchParams}`);
      const searchData = await searchRes.json();

      if (!searchData.items || searchData.items.length === 0) {
        return {
          success: true,
          message: `No Stack Overflow results found for: "${query}"`,
          results: [],
        };
      }

      const questions: StackExchangeQuestion[] = searchData.items;

      // Step 2: Fetch the top/accepted answer for each question
      const questionIds = questions.map((q) => q.question_id).join(';');
      const answersParams = new URLSearchParams({
        order: 'desc',
        sort: 'votes',
        site: 'stackoverflow',
        filter: 'withbody',
        pagesize: '10',
      });

      const answersRes = await fetch(
        `https://api.stackexchange.com/2.3/questions/${questionIds}/answers?${answersParams}`
      );
      const answersData = await answersRes.json();

      // Group answers by question_id, preferring accepted answers
      const answersByQuestion = new Map<number, StackExchangeAnswer>();
      if (answersData.items) {
        for (const answer of answersData.items as StackExchangeAnswer[]) {
          const existing = answersByQuestion.get(answer.question_id);
          // Prefer accepted answer, then highest score
          if (!existing || answer.is_accepted || (!existing.is_accepted && answer.score > existing.score)) {
            answersByQuestion.set(answer.question_id, answer);
          }
        }
      }

      // Step 3: Build structured results
      const results = questions.map((q) => {
        const answer = answersByQuestion.get(q.question_id);
        return {
          title: decodeHtmlEntities(q.title),
          link: q.link,
          score: q.score,
          tags: q.tags.slice(0, 5),
          isAnswered: q.is_answered,
          answerSummary: answer
            ? truncate(stripHtml(decodeHtmlEntities(answer.body)), 500)
            : 'No answer available',
          answerScore: answer?.score ?? 0,
          isAccepted: answer?.is_accepted ?? false,
        };
      });

      return {
        success: true,
        message: `Found ${results.length} relevant Stack Overflow result(s) for: "${query}"`,
        results,
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to search Stack Overflow',
        results: [],
      };
    }
  },
});
