import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const bookId = searchParams.get("bookId");
  const discussionId = searchParams.get("discussionId");

  if (!bookId || !discussionId) {
    return new Response("Missing bookId or discussionId", { status: 400 });
  }

  const supabase = await createServerSupabaseClient();

  const [{ data: book }, { data: discussion }] = await Promise.all([
    supabase.from("books").select("title, author").eq("id", bookId).single(),
    supabase
      .from("discussions")
      .select("content")
      .eq("id", discussionId)
      .single(),
  ]);

  if (!book || !discussion) {
    return new Response("Not found", { status: 404 });
  }

  const content = discussion.content as {
    hook: string;
    closing_provocation: string;
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "1080px",
          height: "1080px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          backgroundColor: "#0a0a0f",
          color: "#f5f0e8",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Top: Logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            fontSize: "28px",
            color: "#c9a96e",
          }}
        >
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#c9a96e"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
          <span style={{ fontWeight: 700 }}>Verecto</span>
        </div>

        {/* Center: Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "40px",
            flex: 1,
            justifyContent: "center",
          }}
        >
          {/* Book info */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div
              style={{
                fontSize: "36px",
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              {book.title}
            </div>
            {book.author && (
              <div
                style={{
                  fontSize: "22px",
                  color: "#8a8a9a",
                }}
              >
                {`by ${book.author}`}
              </div>
            )}
          </div>

          {/* Hook */}
          <div
            style={{
              fontSize: "32px",
              fontStyle: "italic",
              lineHeight: 1.5,
              color: "#f5f0e8",
            }}
          >
            {`\u201c${content.hook}\u201d`}
          </div>

          {/* Divider */}
          <div
            style={{
              width: "120px",
              height: "2px",
              backgroundColor: "#c9a96e",
            }}
          />

          {/* Closing provocation */}
          <div
            style={{
              fontSize: "22px",
              fontStyle: "italic",
              color: "#8a8a9a",
              lineHeight: 1.5,
            }}
          >
            {`\u201c${content.closing_provocation}\u201d`}
          </div>
        </div>

        {/* Bottom: Tagline */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            fontSize: "18px",
            color: "#4a4a5a",
            fontStyle: "italic",
          }}
        >
          Both sides of every story.
        </div>
      </div>
    ),
    {
      width: 1080,
      height: 1080,
    }
  );
}
