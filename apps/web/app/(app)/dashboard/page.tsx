"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useBooks } from "@/hooks/useBooks";
import { useProfile } from "@/hooks/useProfile";
import { BookCard } from "@/components/BookCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Flame, BookOpen, MessageCircle } from "lucide-react";

interface RecentDiscussion {
  id: string;
  book_id: string;
  created_at: string;
  books: { title: string; author: string } | null;
}

export default function DashboardPage() {
  const router = useRouter();
  const { books, loading: booksLoading } = useBooks();
  const { profile, loading: profileLoading } = useProfile();
  const [email, setEmail] = useState("");
  const [recentDiscussions, setRecentDiscussions] = useState<
    RecentDiscussion[]
  >([]);

  const currentlyReading = books.find((b) => b.status === "reading");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setEmail(user.email || "");
    });

    // Fetch recent discussions
    async function fetchDiscussions() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("discussions")
        .select("id, book_id, created_at, books(title, author)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (data) setRecentDiscussions(data as unknown as RecentDiscussion[]);
    }

    fetchDiscussions();
  }, []);

  const loading = booksLoading || profileLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="font-[family-name:var(--font-serif)] text-3xl font-bold">
          Welcome back{profile?.username ? `, ${profile.username}` : ""}
        </h1>
        <p className="mt-1 text-[var(--muted-foreground)]">{email}</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10">
              <Flame className="h-6 w-6 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {profile?.reading_streak || 0}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Day streak
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10">
              <BookOpen className="h-6 w-6 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {books.filter((b) => b.status === "finished").length}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Books finished
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)]/10">
              <MessageCircle className="h-6 w-6 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {recentDiscussions.length}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Discussions
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Currently Reading */}
      <div>
        <h2 className="mb-4 font-[family-name:var(--font-serif)] text-xl font-semibold">
          Currently Reading
        </h2>
        {currentlyReading ? (
          <div className="space-y-3">
            <BookCard
              title={currentlyReading.title}
              author={currentlyReading.author || "Unknown"}
              coverUrl={currentlyReading.cover_url}
              status={currentlyReading.status}
              onClick={() => router.push("/library")}
            />
            <Button
              onClick={() =>
                router.push(`/discussion/${currentlyReading.id}`)
              }
            >
              Generate Discussion
            </Button>
          </div>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-[var(--muted-foreground)]">
              No book in progress.
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push("/library")}
            >
              Browse your library
            </Button>
          </Card>
        )}
      </div>

      {/* Recent Discussions */}
      <div>
        <h2 className="mb-4 font-[family-name:var(--font-serif)] text-xl font-semibold">
          Recent Discussions
        </h2>
        {recentDiscussions.length > 0 ? (
          <div className="space-y-2">
            {recentDiscussions.map((d) => (
              <Card
                key={d.id}
                className="cursor-pointer p-4 transition-colors hover:border-[var(--primary)]/40"
                onClick={() => router.push(`/discussion/${d.book_id}`)}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {d.books?.title || "Unknown Book"}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {d.books?.author}
                    </p>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {new Date(d.created_at).toLocaleDateString()}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)]">
            No discussions yet. Add a book and generate your first one!
          </p>
        )}
      </div>
    </div>
  );
}
