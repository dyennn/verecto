"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { searchBooks, getBookDetails, type BookSearchResult } from "@/lib/openlibrary";
import { useBooks, type BookRow } from "@/hooks/useBooks";
import { BookCard } from "@/components/BookCard";
import { MoodTag } from "@/components/MoodTag";
import { ImportModal } from "@/components/ImportModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { Search, Plus, X, Loader2, Upload } from "lucide-react";

export default function LibraryPage() {
  const router = useRouter();
  const { books, loading, addBook, updateBook, importBooks } = useBooks();
  const { toast } = useToast();

  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<BookSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [selectedBook, setSelectedBook] = useState<BookRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const handleSearch = useCallback(
    async (q: string) => {
      setQuery(q);
      if (q.length < 2) {
        setSearchResults([]);
        return;
      }
      setSearching(true);
      try {
        const results = await searchBooks(q);
        setSearchResults(results);
      } catch {
        toast({
          title: "Search failed",
          description: "Could not reach Open Library. Try again.",
          variant: "destructive",
        });
      } finally {
        setSearching(false);
      }
    },
    [toast]
  );

  async function handleAddBook(result: BookSearchResult) {
    setAdding(result.ol_key);

    // Fetch synopsis if available
    let synopsis = result.synopsis;
    if (!synopsis && result.ol_key) {
      try {
        const details = await getBookDetails(result.ol_key);
        synopsis = details.synopsis || null;
      } catch {
        // ignore
      }
    }

    const { error } = await addBook({
      ol_key: result.ol_key,
      title: result.title,
      author: result.author,
      genre: result.genre || undefined,
      cover_url: result.cover_url || undefined,
      synopsis: synopsis || undefined,
      status: "want_to_read",
    });

    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      toast({ title: "Added!", description: `${result.title} added to your library.` });
      setQuery("");
      setSearchResults([]);
    }
    setAdding(null);
  }

  async function handleStatusChange(
    book: BookRow,
    status: "want_to_read" | "reading" | "finished"
  ) {
    const { error } = await updateBook(book.id, { status });
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    }
  }

  async function handleMoodSelect(
    book: BookRow,
    mood: "loved_it" | "it_was_fine" | "dnf"
  ) {
    const { error } = await updateBook(book.id, { mood });
    if (error) {
      toast({ title: "Error", description: error, variant: "destructive" });
    } else {
      setSelectedBook((prev) => (prev ? { ...prev, mood } : null));
    }
  }

  const wantToRead = books.filter((b) => b.status === "want_to_read");
  const reading = books.filter((b) => b.status === "reading");
  const finished = books.filter((b) => b.status === "finished");

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="font-[family-name:var(--font-serif)] text-3xl font-bold">
          Library
        </h1>
        <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Import CSV
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
        <Input
          placeholder="Search for a book to add..."
          className="pl-10"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
        />
        {searching && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--muted-foreground)]" />
        )}
      </div>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-[var(--muted-foreground)]">
              Search Results
            </h2>
            <button
              onClick={() => {
                setSearchResults([]);
                setQuery("");
              }}
              className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Clear
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {searchResults.map((result) => (
              <Card key={result.ol_key} className="flex items-center gap-3 p-3">
                <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded bg-[var(--secondary)]">
                  {result.cover_url ? (
                    <img
                      src={result.cover_url}
                      alt={result.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[8px] text-[var(--muted-foreground)]">
                      No Cover
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="truncate text-sm font-medium">{result.title}</p>
                  <p className="truncate text-xs text-[var(--muted-foreground)]">
                    {result.author}
                    {result.first_publish_year
                      ? ` (${result.first_publish_year})`
                      : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={adding === result.ol_key}
                  onClick={() => handleAddBook(result)}
                >
                  {adding === result.ol_key ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Personal Library */}
      <Tabs defaultValue="reading">
        <TabsList>
          <TabsTrigger value="reading">
            Reading ({reading.length})
          </TabsTrigger>
          <TabsTrigger value="want_to_read">
            Want to Read ({wantToRead.length})
          </TabsTrigger>
          <TabsTrigger value="finished">
            Finished ({finished.length})
          </TabsTrigger>
        </TabsList>

        {(
          [
            ["reading", reading],
            ["want_to_read", wantToRead],
            ["finished", finished],
          ] as const
        ).map(([key, list]) => (
          <TabsContent key={key} value={key}>
            {list.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-[var(--muted-foreground)]">
                  No books here yet.
                </p>
              </Card>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {list.map((book) => (
                  <BookCard
                    key={book.id}
                    title={book.title}
                    author={book.author || "Unknown"}
                    coverUrl={book.cover_url}
                    status={book.status}
                    mood={book.mood}
                    onClick={() => setSelectedBook(book)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Book Detail Modal */}
      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="font-[family-name:var(--font-serif)] text-2xl">
                  {selectedBook.title}
                </CardTitle>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {selectedBook.author}
                </p>
              </div>
              <button
                onClick={() => setSelectedBook(null)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-6">
              {selectedBook.synopsis && (
                <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                  {selectedBook.synopsis.slice(0, 300)}
                  {selectedBook.synopsis.length > 300 ? "..." : ""}
                </p>
              )}

              {/* Status controls */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Status</p>
                <div className="flex gap-2">
                  {(
                    ["want_to_read", "reading", "finished"] as const
                  ).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={
                        selectedBook.status === s ? "default" : "outline"
                      }
                      onClick={() => {
                        handleStatusChange(selectedBook, s);
                        setSelectedBook((prev) =>
                          prev ? { ...prev, status: s } : null
                        );
                      }}
                    >
                      {s === "want_to_read"
                        ? "Want to Read"
                        : s === "reading"
                          ? "Reading"
                          : "Finished"}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Mood (only for finished) */}
              {selectedBook.status === "finished" && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">How was it?</p>
                  <MoodTag
                    mood={selectedBook.mood}
                    onSelect={(mood) =>
                      handleMoodSelect(selectedBook, mood)
                    }
                  />
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    router.push(`/discussion/${selectedBook.id}`);
                    setSelectedBook(null);
                  }}
                >
                  View Discussion
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        existingBooks={books}
        onImport={importBooks}
      />
    </div>
  );
}
