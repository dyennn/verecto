"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { ArrowLeft, Users, Copy, BookOpen, Trash2 } from "lucide-react";
import { ReactionBar } from "@/components/ReactionBar";

interface ClubDetail {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  book_id: string | null;
  created_at: string;
}

interface Member {
  id: string;
  user_id: string;
  role: string;
  username: string | null;
}

interface SharedDiscussion {
  id: string;
  note: string | null;
  created_at: string;
  shared_by_username: string | null;
  discussion_hook: string;
  book_title: string;
}

export default function ClubDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const clubId = params.clubId as string;

  const [club, setClub] = useState<ClubDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [discussions, setDiscussions] = useState<SharedDiscussion[]>([]);
  const [bookTitle, setBookTitle] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);

  const fetchClub = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);

    // Fetch club
    const { data: clubData } = await supabase
      .from("book_clubs")
      .select("*")
      .eq("id", clubId)
      .single();

    if (!clubData) {
      router.push("/clubs");
      return;
    }
    setClub(clubData);
    setIsOwner(clubData.created_by === user.id);

    // Fetch book title
    if (clubData.book_id) {
      const { data: bookData } = await supabase
        .from("books")
        .select("title")
        .eq("id", clubData.book_id)
        .single();
      if (bookData) setBookTitle(bookData.title);
    }

    // Fetch members with profiles
    const { data: memberData } = await supabase
      .from("book_club_members")
      .select("id, user_id, role")
      .eq("club_id", clubId);

    if (memberData) {
      const enrichedMembers = await Promise.all(
        memberData.map(async (m) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", m.user_id)
            .single();
          return { ...m, username: profile?.username || null };
        })
      );
      setMembers(enrichedMembers);
    }

    // Fetch shared discussions
    const { data: sharedData } = await supabase
      .from("book_club_discussions")
      .select("id, note, created_at, shared_by, discussion_id")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false });

    if (sharedData) {
      const enrichedDiscussions = await Promise.all(
        sharedData.map(async (sd) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("username")
            .eq("id", sd.shared_by)
            .single();

          const { data: disc } = await supabase
            .from("discussions")
            .select("content, book_id")
            .eq("id", sd.discussion_id)
            .single();

          let book_title = "Unknown";
          if (disc?.book_id) {
            const { data: bookData } = await supabase
              .from("books")
              .select("title")
              .eq("id", disc.book_id)
              .single();
            if (bookData) book_title = bookData.title;
          }

          const content = disc?.content as { hook?: string } | null;

          return {
            id: sd.id,
            note: sd.note,
            created_at: sd.created_at,
            shared_by_username: profile?.username || null,
            discussion_hook: content?.hook || "No hook available",
            book_title,
          };
        })
      );
      setDiscussions(enrichedDiscussions);
    }

    setLoading(false);
  }, [clubId, router]);

  useEffect(() => {
    fetchClub();
  }, [fetchClub]);

  function handleCopyInvite() {
    if (!club) return;
    navigator.clipboard.writeText(club.invite_code);
    toast({ title: "Invite code copied!" });
  }

  async function handleEndClub() {
    if (!club || !isOwner) return;
    const supabase = createClient();
    const { error } = await supabase
      .from("book_clubs")
      .delete()
      .eq("id", club.id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Club ended" });
      router.push("/clubs");
    }
  }

  function getInitials(name: string | null): string {
    if (!name) return "?";
    return name
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    );
  }

  if (!club) return null;

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button
          onClick={() => router.push("/clubs")}
          className="mt-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-[family-name:var(--font-serif)] text-3xl font-bold">
            {club.name}
          </h1>
          {bookTitle && (
            <p className="mt-1 flex items-center gap-2 text-[var(--muted-foreground)]">
              <BookOpen className="h-4 w-4" />
              Reading: {bookTitle}
            </p>
          )}
        </div>
        {isOwner && (
          <Button variant="outline" size="sm" onClick={handleEndClub}>
            <Trash2 className="mr-2 h-4 w-4" />
            End Club
          </Button>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        {/* Members */}
        <Card className="sm:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-4 w-4 text-[var(--primary)]" />
              Members ({members.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-3">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold"
                  style={{
                    backgroundColor: "var(--primary)",
                    color: "var(--primary-foreground)",
                  }}
                >
                  {getInitials(m.username)}
                </div>
                <div>
                  <p className="text-sm font-medium">
                    {m.username || "Anonymous"}
                    {m.user_id === currentUserId && (
                      <span className="ml-1 text-xs text-[var(--muted-foreground)]">
                        (you)
                      </span>
                    )}
                  </p>
                  {m.role === "owner" && (
                    <p className="text-xs text-[var(--primary)]">Owner</p>
                  )}
                </div>
              </div>
            ))}

            {/* Invite section */}
            <div className="mt-4 border-t border-[var(--border)] pt-4">
              <p className="mb-2 text-xs font-medium text-[var(--muted-foreground)]">
                Invite Code
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-[var(--secondary)] px-2 py-1 text-sm">
                  {club.invite_code}
                </code>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyInvite}
                >
                  <Copy className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Shared Discussions */}
        <div className="space-y-4 sm:col-span-2">
          <h2 className="font-[family-name:var(--font-serif)] text-xl font-semibold">
            Shared Discussions
          </h2>
          {discussions.length === 0 ? (
            <Card className="p-8 text-center">
              <p className="text-[var(--muted-foreground)]">
                No discussions shared yet. Visit a book&apos;s discussion page
                and click &ldquo;Share to Club&rdquo;.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {discussions.map((d) => (
                <Card key={d.id}>
                  <CardContent className="p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold"
                          style={{
                            backgroundColor: "var(--primary)",
                            color: "var(--primary-foreground)",
                          }}
                        >
                          {getInitials(d.shared_by_username)}
                        </div>
                        <span className="text-sm font-medium">
                          {d.shared_by_username || "Anonymous"}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--muted-foreground)]">
                        {new Date(d.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {d.book_title}
                    </p>
                    <p className="mt-2 font-[family-name:var(--font-serif)] text-sm italic text-[var(--foreground)]">
                      &ldquo;{d.discussion_hook}&rdquo;
                    </p>
                    {d.note && (
                      <p className="mt-2 rounded bg-[var(--secondary)] p-2 text-sm text-[var(--muted-foreground)]">
                        {d.note}
                      </p>
                    )}
                    <ReactionBar discussionId={d.id} />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
