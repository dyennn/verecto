"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useDiscussion } from "@/hooks/useDiscussion";
import { useQuotes } from "@/hooks/useQuotes";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useBooks } from "@/hooks/useBooks";
import { DiscussionGuide } from "@/components/DiscussionGuide";
import { AudioPlayer } from "@/components/AudioPlayer";
import { discussionToScript } from "@/lib/discussion-to-script";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import {
  ArrowLeft,
  RefreshCw,
  Loader2,
  Share2,
  Copy,
  Headphones,
  Users,
  Quote,
  Plus,
  Trash2,
  Sparkles,
  BookPlus,
} from "lucide-react";
import type { DiscussionGuide as DiscussionGuideType } from "@/lib/openrouter";

interface BookInfo {
  id: string;
  title: string;
  author: string | null;
  cover_url: string | null;
  status: string;
  current_chapter: number | null;
  total_chapters: number | null;
}

interface DiscussionEntry {
  id: string;
  content: DiscussionGuideType;
  created_at: string;
  model_used: string | null;
  chapter_number: number | null;
  total_chapters: number | null;
  perspective: string | null;
}

interface ClubOption {
  id: string;
  name: string;
}

type PerspectiveOption = "standard" | "antagonist" | "minor_character" | "historical";

const PERSPECTIVE_OPTIONS: { value: PerspectiveOption; label: string; description: string }[] = [
  { value: "standard", label: "Standard", description: "Balanced discussion guide" },
  { value: "antagonist", label: "Antagonist's View", description: "Through the villain's eyes" },
  { value: "minor_character", label: "Minor Character", description: "A background character's lens" },
  { value: "historical", label: "Historical Context", description: "The era and cultural backdrop" },
];

const PERSPECTIVE_LABELS: Record<string, string> = {
  antagonist: "Antagonist's View",
  minor_character: "Minor Character",
  historical: "Historical Context",
};

export default function DiscussionPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  const { discussion, loading, generating, fetchDiscussion, generateDiscussion } =
    useDiscussion();
  const { quotes, fetchQuotes, addQuote, deleteQuote } = useQuotes(bookId);
  const { recommendations, generating: generatingRecs, fetchRecommendations, generateRecommendations } = useRecommendations();
  const { addBook } = useBooks();
  const { toast } = useToast();
  const [book, setBook] = useState<BookInfo | null>(null);
  const [showAudio, setShowAudio] = useState(false);
  const [pastDiscussions, setPastDiscussions] = useState<DiscussionEntry[]>([]);
  const [selectedDiscussionId, setSelectedDiscussionId] = useState<string | null>(null);
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [shareClubOpen, setShareClubOpen] = useState(false);
  const [shareNote, setShareNote] = useState("");
  const [selectedClubId, setSelectedClubId] = useState("");
  const [perspective, setPerspective] = useState<PerspectiveOption>("standard");

  // Quote form state
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [quoteText, setQuoteText] = useState("");
  const [quotePage, setQuotePage] = useState("");
  const [addingQuote, setAddingQuote] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase
        .from("books")
        .select("id, title, author, cover_url, status, current_chapter, total_chapters")
        .eq("id", bookId)
        .single();

      if (data) setBook(data);
      await fetchDiscussion(bookId);
      await fetchQuotes();
      if (data?.status === "finished") {
        await fetchRecommendations(bookId);
      }

      // Fetch all discussions for this book (timeline)
      const { data: allDiscussions } = await supabase
        .from("discussions")
        .select("id, content, created_at, model_used, chapter_number, total_chapters, perspective")
        .eq("book_id", bookId)
        .order("created_at", { ascending: false });

      if (allDiscussions && allDiscussions.length > 1) {
        setPastDiscussions(allDiscussions as DiscussionEntry[]);
      }

      // Fetch clubs the user belongs to that are reading this book
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: memberClubs } = await supabase
          .from("book_club_members")
          .select("club_id")
          .eq("user_id", user.id);

        if (memberClubs && memberClubs.length > 0) {
          const clubIds = memberClubs.map((m: { club_id: string }) => m.club_id);
          const { data: matchingClubs } = await supabase
            .from("book_clubs")
            .select("id, name")
            .in("id", clubIds);

          if (matchingClubs) setClubs(matchingClubs);
        }
      }
    }

    load();
  }, [bookId, fetchDiscussion, fetchQuotes, fetchRecommendations]);

  async function handleGenerate() {
    const result = await generateDiscussion(bookId, { perspective });
    if (result.error) {
      toast({
        title: "Generation failed",
        description: result.error,
        variant: "destructive",
      });
    } else {
      toast({ title: "Discussion generated!" });
      // Refresh timeline
      const supabase = createClient();
      const { data: allDiscussions } = await supabase
        .from("discussions")
        .select("id, content, created_at, model_used, chapter_number, total_chapters, perspective")
        .eq("book_id", bookId)
        .order("created_at", { ascending: false });
      if (allDiscussions && allDiscussions.length > 1) {
        setPastDiscussions(allDiscussions as DiscussionEntry[]);
      }
    }
  }

  async function handleShareCard() {
    if (!discussion) return;
    try {
      const res = await fetch(
        `/api/share-card?bookId=${bookId}&discussionId=${discussion.id}`
      );
      if (!res.ok) throw new Error("Failed to generate card");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `verecto-${book?.title?.replace(/\s+/g, "-").toLowerCase() || "discussion"}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Card saved! Share it on BookTok." });
    } catch {
      toast({
        title: "Error",
        description: "Could not generate share card.",
        variant: "destructive",
      });
    }
  }

  function handleCopyHook() {
    if (!discussion?.content?.hook) return;
    navigator.clipboard.writeText(discussion.content.hook);
    toast({ title: "Hook copied to clipboard!" });
  }

  async function handleShareToClub() {
    if (!selectedClubId || !discussion) return;
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("book_club_discussions").insert({
      club_id: selectedClubId,
      discussion_id: discussion.id,
      shared_by: user.id,
      note: shareNote.trim() || null,
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Shared to club!" });
      setShareClubOpen(false);
      setShareNote("");
      setSelectedClubId("");
    }
  }

  async function handleAddQuote() {
    if (!quoteText.trim()) return;
    setAddingQuote(true);
    const pageNum = quotePage ? parseInt(quotePage, 10) : undefined;
    const result = await addQuote(quoteText, pageNum);
    setAddingQuote(false);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      setQuoteText("");
      setQuotePage("");
      setShowQuoteForm(false);
      toast({ title: "Quote saved!" });
    }
  }

  async function handleDeleteQuote(quoteId: string) {
    const result = await deleteQuote(quoteId);
    if (result.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  const displayedDiscussion = selectedDiscussionId
    ? pastDiscussions.find((d) => d.id === selectedDiscussionId)
    : discussion;

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
            <p className="mt-1 text-[var(--muted-foreground)]">by {book.author}</p>
          )}
          {book?.current_chapter && book?.total_chapters && (
            <p className="mt-1 text-sm text-[var(--primary)]">
              Discussion for Chapter {book.current_chapter} of {book.total_chapters}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {discussion && (
            <>
              <Button variant="outline" size="sm" onClick={handleShareCard}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </Button>
              {clubs.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShareClubOpen(true)}
                >
                  <Users className="mr-2 h-4 w-4" />
                  Share to Club
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Perspective selector */}
      <div className="space-y-2">
        <p className="text-sm font-medium text-[var(--muted-foreground)]">Perspective</p>
        <div className="flex flex-wrap gap-2">
          {PERSPECTIVE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPerspective(opt.value)}
              title={opt.description}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                perspective === opt.value
                  ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
                  : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/40"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Generate button */}
      <div className="flex justify-end">
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

      {/* Audio player */}
      {discussion && showAudio && (
        <AudioPlayer
          script={discussionToScript(discussion.content, book?.title || "Book")}
          bookTitle={book?.title || "Book"}
        />
      )}

      {/* Discussion Content */}
      {displayedDiscussion ? (
        <div>
          <div className="mb-6 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs text-[var(--muted-foreground)]">
                Generated on{" "}
                {new Date(displayedDiscussion.created_at).toLocaleDateString()}{" "}
                using {displayedDiscussion.model_used}
                {displayedDiscussion.chapter_number
                  ? ` (Chapter ${displayedDiscussion.chapter_number})`
                  : ""}
              </p>
              {displayedDiscussion.perspective && (
                <p className="text-xs text-[var(--primary)]">
                  {PERSPECTIVE_LABELS[displayedDiscussion.perspective] ??
                    displayedDiscussion.perspective}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={handleCopyHook}>
                <Copy className="mr-1 h-3 w-3" />
                Copy hook
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAudio(!showAudio)}
              >
                <Headphones className="mr-1 h-3 w-3" />
                {showAudio ? "Hide player" : "Listen"}
              </Button>
            </div>
          </div>
          <DiscussionGuide
            discussion={
              "content" in displayedDiscussion
                ? displayedDiscussion.content
                : (displayedDiscussion as unknown as { content: DiscussionGuideType }).content
            }
          />
        </div>
      ) : (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-12 text-center">
          <p className="text-lg text-[var(--muted-foreground)]">
            No discussion yet for this book.
          </p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Click &ldquo;Generate Discussion&rdquo; to create an AI-powered discussion guide.
          </p>
        </div>
      )}

      {/* Discussion timeline */}
      {pastDiscussions.length > 1 && (
        <div className="space-y-3">
          <h3 className="font-[family-name:var(--font-serif)] text-lg font-semibold">
            Discussion History
          </h3>
          <div className="space-y-2 border-l-2 border-[var(--border)] pl-4">
            {pastDiscussions.map((d) => (
              <button
                key={d.id}
                onClick={() =>
                  setSelectedDiscussionId(d.id === selectedDiscussionId ? null : d.id)
                }
                className={`block w-full rounded-md p-3 text-left transition-colors ${
                  selectedDiscussionId === d.id ||
                  (!selectedDiscussionId && d.id === discussion?.id)
                    ? "border border-[var(--primary)]/40 bg-[var(--primary)]/5"
                    : "border border-[var(--border)] hover:border-[var(--primary)]/20"
                }`}
              >
                <p className="text-sm font-medium">
                  {d.chapter_number
                    ? `Chapter ${d.chapter_number}${d.total_chapters ? ` of ${d.total_chapters}` : ""} discussion`
                    : "Full book discussion"}
                  {d.perspective && (
                    <span className="ml-2 text-xs text-[var(--primary)]">
                      · {PERSPECTIVE_LABELS[d.perspective] ?? d.perspective}
                    </span>
                  )}
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {new Date(d.created_at).toLocaleDateString()}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Quotes Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-[family-name:var(--font-serif)] text-lg font-semibold flex items-center gap-2">
            <Quote className="h-4 w-4 text-[var(--primary)]" />
            Your Quotes
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowQuoteForm(!showQuoteForm)}
          >
            <Plus className="mr-1 h-3 w-3" />
            Add Quote
          </Button>
        </div>

        {/* Add quote form */}
        {showQuoteForm && (
          <div className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-4 space-y-3">
            <textarea
              value={quoteText}
              onChange={(e) => setQuoteText(e.target.value)}
              placeholder="Paste a memorable passage..."
              rows={3}
              autoFocus
              className="w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={quotePage}
                onChange={(e) => setQuotePage(e.target.value)}
                placeholder="Page (optional)"
                min={1}
                className="w-36 rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
              />
              <div className="flex gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setShowQuoteForm(false);
                    setQuoteText("");
                    setQuotePage("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddQuote}
                  disabled={!quoteText.trim() || addingQuote}
                >
                  {addingQuote ? <Loader2 className="h-3 w-3 animate-spin" /> : "Save"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Quotes list */}
        {quotes.length > 0 ? (
          <div className="space-y-3">
            {quotes.map((q) => (
              <div
                key={q.id}
                className="group relative rounded-lg border border-[var(--border)] bg-[var(--card)] p-4"
              >
                <blockquote className="border-l-2 border-[var(--primary)] pl-3 text-sm italic leading-relaxed">
                  {q.text}
                </blockquote>
                {q.page_number && (
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    p. {q.page_number}
                  </p>
                )}
                <button
                  onClick={() => handleDeleteQuote(q.id)}
                  className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--muted-foreground)] hover:text-red-500"
                  aria-label="Delete quote"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          !showQuoteForm && (
            <p className="text-sm text-[var(--muted-foreground)]">
              No quotes saved yet. Highlight a memorable passage and save it here
              — quotes are used to personalize your discussion guides.
            </p>
          )
        )}
      </div>

      {/* Similar Books Recommendations */}
      {book?.status === "finished" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center gap-2 font-[family-name:var(--font-serif)] text-lg font-semibold">
              <Sparkles className="h-4 w-4 text-[var(--primary)]" />
              Similar Books
            </h3>
            {recommendations.length === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateRecommendations(bookId)}
                disabled={generatingRecs}
              >
                {generatingRecs ? (
                  <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                ) : (
                  <Sparkles className="mr-1 h-3 w-3" />
                )}
                {generatingRecs ? "Finding..." : "Find similar books"}
              </Button>
            )}
          </div>

          {recommendations.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 rounded-lg border border-[var(--border)] bg-[var(--card)] p-3"
                >
                  {rec.cover_url && (
                    <img
                      src={rec.cover_url}
                      alt={`Cover of ${rec.title}`}
                      className="h-24 w-16 self-center rounded object-cover shadow-sm"
                    />
                  )}
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-snug">{rec.title}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">{rec.author}</p>
                    <p className="text-xs text-[var(--muted-foreground)] italic">{rec.reason}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={async () => {
                      const result = await addBook({
                        title: rec.title,
                        author: rec.author,
                        cover_url: rec.cover_url,
                        ol_key: rec.ol_key,
                        status: "want_to_read",
                      });
                      if (result.error) {
                        toast({ title: "Error", description: result.error, variant: "destructive" });
                      } else {
                        toast({ title: `"${rec.title}" added to Want to Read!` });
                      }
                    }}
                  >
                    <BookPlus className="mr-1 h-3 w-3" />
                    Add to Library
                  </Button>
                </div>
              ))}
            </div>
          ) : !generatingRecs ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              Get AI-powered book recommendations based on what you just finished.
            </p>
          ) : null}
        </div>
      )}

      {/* Share to Club modal */}
      {shareClubOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-lg border border-[var(--border)] bg-[var(--card)] p-6">
            <h3 className="mb-4 font-[family-name:var(--font-serif)] text-xl font-semibold">
              Share to Book Club
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Select club</label>
                <select
                  value={selectedClubId}
                  onChange={(e) => setSelectedClubId(e.target.value)}
                  className="w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm"
                >
                  <option value="">Choose a club...</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Note (optional)</label>
                <textarea
                  value={shareNote}
                  onChange={(e) => setShareNote(e.target.value)}
                  placeholder="Add a thought about this discussion..."
                  rows={3}
                  className="w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShareClubOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleShareToClub} disabled={!selectedClubId}>
                  Share
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
