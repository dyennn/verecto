import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { OpenRouter } from "@openrouter/sdk";
import type { ChatResponse } from "@openrouter/sdk/models/chatresponse.js";

const LOCAL_LLM_URL = process.env.LOCAL_LLM_URL;
const LOCAL_LLM_MODEL = process.env.LOCAL_LLM_MODEL ?? "llama3.3";

const FREE_MODEL_FALLBACKS = [
  "nvidia/nemotron-3-super-120b-a12b:free",
  "nousresearch/hermes-3-llama-3.1-405b:free",
  "nvidia/nemotron-3-nano-30b-a3b:free",
];

export interface RecommendedBook {
  title: string;
  author: string;
  reason: string;
  ol_key?: string;
  cover_url?: string;
}

async function resolveOpenLibraryCover(
  title: string,
  author: string
): Promise<{ ol_key?: string; cover_url?: string }> {
  try {
    const query = encodeURIComponent(`${title} ${author}`);
    const res = await fetch(
      `https://openlibrary.org/search.json?q=${query}&limit=1&fields=key,cover_i`
    );
    if (!res.ok) return {};
    const data = await res.json();
    const doc = data.docs?.[0];
    if (!doc) return {};
    const ol_key = doc.key as string | undefined;
    const cover_url = doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : undefined;
    return { ol_key, cover_url };
  } catch {
    return {};
  }
}

async function generateRecommendationsLLM(
  bookTitle: string,
  bookAuthor: string,
  genre: string | null,
  apiKey: string
): Promise<RecommendedBook[]> {
  const prompt = `You are a book recommendation engine. Given a book the reader just finished, suggest 3 similar books they would enjoy.

BOOK JUST FINISHED:
- Title: ${bookTitle}
- Author: ${bookAuthor}
- Genre: ${genre ?? "Unknown"}

Respond with ONLY a JSON array of exactly 3 objects. No preamble, no markdown, no explanation.
Each object must have these exact fields:
[
  {
    "title": "book title",
    "author": "author name",
    "reason": "one sentence explaining why they'd enjoy it based on similarities to the finished book"
  }
]`;

  if (LOCAL_LLM_URL) {
    const res = await fetch(`${LOCAL_LLM_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer ollama" },
      body: JSON.stringify({
        model: LOCAL_LLM_MODEL,
        max_tokens: 1024,
        temperature: 0.7,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) throw new Error(`Ollama error ${res.status}`);
    const data = await res.json();
    return JSON.parse(data.choices[0].message.content as string);
  }

  const client = new OpenRouter({
    apiKey,
    httpReferer: "https://verecto.app",
    appTitle: "Verecto",
  });

  const response = await client.chat.send({
    chatGenerationParams: {
      models: FREE_MODEL_FALLBACKS,
      maxTokens: 1024,
      temperature: 0.7,
      provider: { requireParameters: true },
      messages: [{ role: "user", content: prompt }],
    },
  });

  const chatResponse = response as ChatResponse;
  const raw = chatResponse.choices[0].message.content as string;
  return JSON.parse(raw);
}

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isLocalLLM = !!LOCAL_LLM_URL;
  const apiKey = process.env.OPENROUTER_API_KEY ?? "";
  if (!isLocalLLM && !apiKey) {
    return NextResponse.json(
      { error: "No LLM configured: set OPENROUTER_API_KEY or LOCAL_LLM_URL" },
      { status: 500 }
    );
  }

  const { bookId } = await request.json();
  if (!bookId) {
    return NextResponse.json({ error: "bookId is required" }, { status: 400 });
  }

  // Fetch book
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("title, author, genre")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();

  if (bookError || !book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  // Check cache
  const { data: cached } = await supabase
    .from("recommendations")
    .select("recommended_books")
    .eq("user_id", user.id)
    .eq("book_id", bookId)
    .single();

  if (cached) {
    return NextResponse.json({
      success: true,
      recommendations: cached.recommended_books as RecommendedBook[],
    });
  }

  // Generate via LLM
  let recs: RecommendedBook[];
  try {
    recs = await generateRecommendationsLLM(
      book.title,
      book.author,
      book.genre,
      apiKey
    );
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to generate recommendations" },
      { status: 500 }
    );
  }

  // Enrich with Open Library covers in parallel
  const enriched = await Promise.all(
    recs.map(async (rec) => {
      const { ol_key, cover_url } = await resolveOpenLibraryCover(
        rec.title,
        rec.author
      );
      return { ...rec, ol_key, cover_url };
    })
  );

  // Save to cache
  await supabase
    .from("recommendations")
    .insert({ user_id: user.id, book_id: bookId, recommended_books: enriched });

  return NextResponse.json({ success: true, recommendations: enriched });
}
