"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useDiscussion } from "@/hooks/useDiscussion";
import { DiscussionGuide } from "@/components/DiscussionGuide";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, RefreshCw, Loader2 } from "lucide-react";

interface BookInfo {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  status: string;
}

export default function DiscussionPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  const { discussion, loading, generating, fetchDiscussion, generateDiscussion } =
    useDiscussion();
  const { toast } = useToast();
  const [book, setBook] = useState<BookInfo | null>(null);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("books")
        .select("id, title, author, cover_url, status")
        .eq("id", bookId)
        .single();

      if (data) setBook(data);
      await fetchDiscussion(bookId);
    }

    load();
  }, [bookId, fetchDiscussion]);

  async function handleGenerate() {
    const result = await generateDiscussion(bookId);
    if (result.error) {
      toast({
        title: "Generation failed",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({ title: "Discussion generated!" });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.back()}
          className="mt-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-[family-name:var(--font-serif)] text-3xl font-bold">
            {book?.title || "Discussion"}
          </h1>
          {book?.author && (
            <p className="mt-1 text-[var(--muted-foreground)]">
              by {book.author}
            </p>
          )}
        </div>
        <Button
          onClick={handleGenerate}
          disabled={generating}
          variant={discussion ? "outline" : "default"}
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : discussion ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate
            </>
          ) : (
            "Generate Discussion"
          )}
        </Button>
      </div>

      {/* Discussion Content */}
      {discussion ? (
        <div>
          <p className="mb-6 text-xs text-[var(--muted-foreground)]">
            Generated on{" "}
            {new Date(discussion.created_at).toLocaleDateString()} using{" "}
            {discussion.model_used}
          </p>
          <DiscussionGuide discussion={discussion.content} />
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <p className="text-lg text-[var(--muted-foreground)]">
            No discussion yet for this book.
          </p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Click &ldquo;Generate Discussion&rdquo; to create an AI-powered
            discussion guide.
          </p>
        </div>
      )}
    </div>
  );
}
