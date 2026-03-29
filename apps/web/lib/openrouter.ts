import { OpenRouter } from "@openrouter/sdk";
import type { ChatResponse } from "@openrouter/sdk/models/chatresponse.js";
import { logModelDecision } from "./model-logger";

const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL;
const LOCAL_LLM_MODEL = process.env.LOCAL_LLM_MODEL ?? "llama3.3";

export const MODELS = {
  free: "nvidia/nemotron-3-super-120b-a12b:free",
  budget: "deepseek/deepseek-chat-v3-2",
  fast: "google/gemini-flash-lite-3.1",
  premium: "anthropic/claude-sonnet-4-6",
};

// Fallback chain for free tier — non-Google providers to avoid Google AI Studio rate limits
// OpenRouter allows max 3 models in the fallback array
const FREE_MODEL_FALLBACKS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
];

export interface Book {
  title: string;
  author: string;
  genre?: string;
  synopsis?: string;
  progress?: string;
}

export interface PastBook {
  title: string;
  author: string;
  mood: string;
}

export interface UserProfile {
  topMoods?: string[];
  favoriteGenres?: string[];
  pastBooks?: PastBook[];
}

export interface DiscussionTheme {
  title: string;
  insight: string;
  question: string;
}

export interface DiscussionGuide {
  hook: string;
  themes: DiscussionTheme[];
  character_spotlight: {
    character: string;
    analysis: string;
    question: string;
  };
  connection_to_reader: string;
  closing_provocation: string;
}

function buildSystemPrompt(): string {
  return `
You are Verecto — a thoughtful, enthusiastic literary companion who helps readers
go deeper into the books they're reading. You are warm, insightful, and conversational,
like a well-read friend who genuinely loves talking about books.

Your job is to generate a structured book discussion guide in JSON format.
The guide should feel like a podcast episode script — engaging, not academic.

Always respond with ONLY valid JSON. No preamble, no markdown fences, no explanation.

Your JSON must follow this exact structure:
{
  "hook": "string — one punchy opening line that makes the reader excited to dig in (max 30 words)",
  "themes": [
    {
      "title": "string — short theme name",
      "insight": "string — 2-3 sentences unpacking this theme in an interesting way",
      "question": "string — one reflection question for the reader"
    }
  ],
  "character_spotlight": {
    "character": "string — name of the most interesting character to discuss",
    "analysis": "string — 2-3 sentences on what makes them compelling or complex",
    "question": "string — one reflection question"
  },
  "connection_to_reader": "string — 1-2 sentences connecting the book to the reader's past reads",
  "closing_provocation": "string — one bold final thought or controversial take (max 25 words)"
}

Rules:
- Language must be conversational, never stuffy or academic
- themes array must have exactly 2-3 items
- If no past books are provided, make connection_to_reader a general emotional observation
- Never spoil plot points beyond what the reader's progress indicates
- Stay spoiler-safe: discuss themes and characters without revealing endings
  `.trim();
}

function buildUserPrompt(book: Book, userProfile: UserProfile): string {
  const pastBooksText = userProfile.pastBooks?.length
    ? userProfile.pastBooks
        .map(
          (b) =>
            `"${b.title}" by ${b.author} (they ${b.mood.replace(/_/g, " ")})`
        )
        .join(", ")
    : null;

  return `
Generate a book discussion guide for the following:

BOOK:
- Title: ${book.title}
- Author: ${book.author}
- Genre: ${book.genre || "Unknown"}
- Synopsis: ${book.synopsis || "Not provided"}
- Reader's progress: ${book.progress || "Finished"}

READER PROFILE:
- Mood tags they've used most: ${userProfile.topMoods?.join(", ") || "not yet tracked"}
- Favorite genres: ${userProfile.favoriteGenres?.join(", ") || "not yet tracked"}
${pastBooksText ? `- Books they've loved before: ${pastBooksText}` : ""}

Generate the discussion guide now.
  `.trim();
}

async function callOllama(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const response = await fetch(`${LOCAL_LLM_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer ollama" },
    body: JSON.stringify({
      model: LOCAL_LLM_MODEL,
      max_tokens: 1200,
      temperature: 0.8,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Ollama error ${response.status}: ${body}`);
  }

  const data = await response.json();
  return data.choices[0].message.content as string;
}

export async function generateDiscussion(
  book: Book,
  userProfile: UserProfile,
  apiKey: string,
  model: string = MODELS.free
): Promise<{ success: boolean; discussion?: DiscussionGuide; error?: string }> {
  const logEntry = {
    timestamp: new Date().toISOString(),
    model: LOCAL_LLM_URL ? LOCAL_LLM_MODEL : model,
    book: { title: book.title, author: book.author },
    rawResponse: null as string | null,
    parsedDiscussion: null as unknown | null,
  };

  try {
    const systemPrompt = buildSystemPrompt();
    const userPrompt = buildUserPrompt(book, userProfile);
    let raw: string;

    if (LOCAL_LLM_URL) {
      raw = await callOllama(systemPrompt, userPrompt);
    } else {
      const client = new OpenRouter({
        apiKey,
        httpReferer: "https://verecto.app",
        appTitle: "Verecto",
      });

      const response = await client.chat.send({
        chatGenerationParams: {
          ...(model.endsWith(":free")
            ? { models: FREE_MODEL_FALLBACKS }
            : { model }),
          maxTokens: 2048,
          temperature: 0.8,
          provider: { requireParameters: true },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        },
      });

      const chatResponse = response as ChatResponse;
      logEntry.model = chatResponse.model ?? logEntry.model;
      raw = chatResponse.choices[0].message.content as string;
    }

    logEntry.rawResponse = raw;
    const discussion: DiscussionGuide = JSON.parse(raw);
    logEntry.parsedDiscussion = discussion;
    logModelDecision(logEntry);

    return { success: true, discussion };
  } catch (err) {
    console.error("Discussion generation failed:", err);
    logModelDecision({
      ...logEntry,
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      success: false,
      error: "Could not generate discussion. Please try again.",
    };
  }
}
