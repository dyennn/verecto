import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { generateDiscussion, MODELS } from "@/lib/openrouter";

const STYLE_INSTRUCTIONS: Record<string, string> = {
  casual:
    "Use a warm, casual tone — as if chatting with friends in a book club. Keep it fun and accessible.",
  academic:
    "Use an academic, analytical tone — reference literary themes, symbolism, and narrative structure where relevant.",
  socratic:
    "Use a Socratic approach — pose thought-provoking questions and let the reader reach their own conclusions. Minimize statements; maximize questions.",
};

const PERSPECTIVE_INSTRUCTIONS: Record<string, string> = {
  antagonist:
    "Generate this discussion from the antagonist's perspective — explore their motivations, their internal logic, and how the story looks from their point of view. Help the reader empathize with the villain.",
  minor_character:
    "Generate this discussion through the lens of a minor or background character — explore what they observe about the main characters and what their presence reveals about the story's deeper themes.",
  historical:
    "Generate this discussion with a focus on the historical and cultural context — explore the time period, the author's background, and how the work reflects or challenges the norms of its era.",
};

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId, perspective = "standard" } = await request.json();

  if (!bookId) {
    return NextResponse.json(
      { error: "bookId is required" },
      { status: 400 }
    );
  }

  // Fetch the book
  const { data: book, error: bookError } = await supabase
    .from("books")
    .select("*")
    .eq("id", bookId)
    .eq("user_id", user.id)
    .single();

  if (bookError || !book) {
    return NextResponse.json({ error: "Book not found" }, { status: 404 });
  }

  // Fetch user profile (includes discussion_style)
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  // Fetch past books for context
  const { data: pastBooks } = await supabase
    .from("books")
    .select("title, author, mood")
    .eq("user_id", user.id)
    .eq("status", "finished")
    .not("mood", "is", null)
    .neq("id", bookId)
    .limit(5);

  // Fetch user's saved quotes for this book
  const { data: savedQuotes } = await supabase
    .from("quotes")
    .select("text, page_number")
    .eq("book_id", bookId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })
    .limit(10);

  const isLocalLLM = !!process.env.LOCAL_LLM_URL;
  const apiKey = process.env.OPENROUTER_API_KEY ?? "";
  if (!isLocalLLM && !apiKey) {
    return NextResponse.json(
      { error: "No LLM configured: set OPENROUTER_API_KEY or LOCAL_LLM_URL" },
      { status: 500 }
    );
  }

  // Build progress string from chapter tracking
  let progressStr = book.progress || undefined;
  if (book.current_chapter && book.total_chapters) {
    progressStr = `Currently on chapter ${book.current_chapter} of ${book.total_chapters} — discuss only up to this point, no spoilers beyond it.`;
  } else {
    progressStr = "Finished.";
  }

  // Append discussion style instruction
  const styleKey = profile?.discussion_style ?? "casual";
  const styleInstruction = STYLE_INSTRUCTIONS[styleKey];
  if (styleInstruction) {
    progressStr += ` ${styleInstruction}`;
  }

  // Append perspective instruction
  const perspectiveInstruction = PERSPECTIVE_INSTRUCTIONS[perspective];
  if (perspectiveInstruction) {
    progressStr += ` ${perspectiveInstruction}`;
  }

  // Build synopsis enriched with saved quotes
  let synopsis = book.synopsis || undefined;
  if (savedQuotes && savedQuotes.length > 0) {
    const quotesText = savedQuotes
      .map((q: { text: string; page_number: number | null }) =>
        q.page_number ? `"${q.text}" (p. ${q.page_number})` : `"${q.text}"`
      )
      .join("\n- ");
    const quotesBlock = `Reader's highlighted passages:\n- ${quotesText}`;
    synopsis = synopsis ? `${synopsis}\n\n${quotesBlock}` : quotesBlock;
  }

  const result = await generateDiscussion(
    {
      title: book.title,
      author: book.author || "Unknown",
      genre: book.genre || undefined,
      synopsis,
      progress: progressStr,
    },
    {
      topMoods: profile?.top_moods || [],
      favoriteGenres: profile?.favorite_genres || [],
      pastBooks: (pastBooks || []).map((b: { title: string; author: string; mood: string }) => ({
        title: b.title,
        author: b.author,
        mood: b.mood,
      })),
    },
    apiKey,
    MODELS.free
  );

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  }

  // Save to database
  const { data: saved, error: saveError } = await supabase
    .from("discussions")
    .insert({
      user_id: user.id,
      book_id: bookId,
      model_used: MODELS.free,
      content: result.discussion,
      chapter_number: book.current_chapter || null,
      total_chapters: book.total_chapters || null,
      progress_snapshot: progressStr || null,
      perspective: perspective === "standard" ? null : perspective,
    })
    .select()
    .single();

  if (saveError) {
    console.error("Error saving discussion:", saveError);
    return NextResponse.json({
      success: true,
      discussion: {
        id: "unsaved",
        book_id: bookId,
        user_id: user.id,
        model_used: MODELS.free,
        content: result.discussion,
        created_at: new Date().toISOString(),
        perspective: perspective === "standard" ? null : perspective,
      },
    });
  }

  return NextResponse.json({ success: true, discussion: saved });
}
