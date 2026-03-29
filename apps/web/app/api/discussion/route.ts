import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { generateDiscussion, MODELS } from "@/lib/openrouter";

export async function POST(request: NextRequest) {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { bookId } = await request.json();

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

  // Fetch user profile
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

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenRouter API key not configured" },
      { status: 500 }
    );
  }

  const result = await generateDiscussion(
    {
      title: book.title,
      author: book.author || "Unknown",
      genre: book.genre || undefined,
      synopsis: book.synopsis || undefined,
      progress: book.progress || undefined,
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
    })
    .select()
    .single();

  if (saveError) {
    console.error("Error saving discussion:", saveError);
    // Still return the discussion even if saving fails
    return NextResponse.json({
      success: true,
      discussion: {
        id: "unsaved",
        book_id: bookId,
        user_id: user.id,
        model_used: MODELS.free,
        content: result.discussion,
        created_at: new Date().toISOString(),
      },
    });
  }

  return NextResponse.json({ success: true, discussion: saved });
}
