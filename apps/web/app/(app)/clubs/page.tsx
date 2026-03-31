"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useBooks } from "@/hooks/useBooks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { Users, Plus, LogIn, X, BookOpen } from "lucide-react";

interface Club {
  id: string;
  name: string;
  invite_code: string;
  created_by: string;
  created_at: string;
  book_id: string | null;
  book_title?: string;
  member_count?: number;
}

export default function ClubsPage() {
  const router = useRouter();
  const { books } = useBooks();
  const { toast } = useToast();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [clubName, setClubName] = useState("");
  const [selectedBookId, setSelectedBookId] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchClubs = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Get clubs the user is a member of
    const { data: memberships } = await supabase
      .from("book_club_members")
      .select("club_id")
      .eq("user_id", user.id);

    if (!memberships || memberships.length === 0) {
      setClubs([]);
      setLoading(false);
      return;
    }

    const clubIds = memberships.map((m) => m.club_id);
    const { data: clubData } = await supabase
      .from("book_clubs")
      .select("*")
      .in("id", clubIds)
      .order("created_at", { ascending: false });

    if (clubData) {
      // Enrich with book titles and member counts
      const enriched = await Promise.all(
        clubData.map(async (club) => {
          let book_title: string | undefined;
          if (club.book_id) {
            const { data: bookData } = await supabase
              .from("books")
              .select("title")
              .eq("id", club.book_id)
              .single();
            book_title = bookData?.title;
          }

          const { count } = await supabase
            .from("book_club_members")
            .select("*", { count: "exact", head: true })
            .eq("club_id", club.id);

          return { ...club, book_title, member_count: count || 0 };
        })
      );
      setClubs(enriched);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchClubs();
  }, [fetchClubs]);

  async function handleCreate() {
    if (!clubName.trim()) return;
    setSubmitting(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: club, error } = await supabase
      .from("book_clubs")
      .insert({
        name: clubName.trim(),
        book_id: selectedBookId || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      setSubmitting(false);
      return;
    }

    // Add creator as owner member
    await supabase.from("book_club_members").insert({
      club_id: club.id,
      user_id: user.id,
      role: "owner",
    });

    toast({ title: "Club created!" });
    setCreateOpen(false);
    setClubName("");
    setSelectedBookId("");
    setSubmitting(false);
    fetchClubs();
  }

  async function handleJoin() {
    if (!inviteCode.trim()) return;
    setSubmitting(true);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Find club by invite code
    const { data: club } = await supabase
      .from("book_clubs")
      .select("id")
      .eq("invite_code", inviteCode.trim())
      .single();

    if (!club) {
      toast({
        title: "Invalid code",
        description: "No club found with that invite code.",
        variant: "destructive",
      });
      setSubmitting(false);
      return;
    }

    const { error } = await supabase.from("book_club_members").insert({
      club_id: club.id,
      user_id: user.id,
      role: "member",
    });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Already a member", description: "You're already in this club." });
      } else {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      }
      setSubmitting(false);
      return;
    }

    toast({ title: "Joined club!" });
    setJoinOpen(false);
    setInviteCode("");
    setSubmitting(false);
    fetchClubs();
  }

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
          Book Clubs
        </h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setJoinOpen(true)}>
            <LogIn className="mr-2 h-4 w-4" />
            Join Club
          </Button>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Club
          </Button>
        </div>
      </div>

      {clubs.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-[var(--muted-foreground)]" />
          <p className="text-lg text-[var(--muted-foreground)]">
            No book clubs yet.
          </p>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            Create a club or join one with an invite code.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {clubs.map((club) => (
            <Card
              key={club.id}
              className="cursor-pointer transition-colors hover:border-[var(--primary)]/40"
              onClick={() => router.push(`/clubs/${club.id}`)}
            >
              <CardHeader className="pb-2">
                <CardTitle className="font-[family-name:var(--font-serif)] text-lg">
                  {club.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {club.book_title && (
                  <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                    <BookOpen className="h-3.5 w-3.5" />
                    {club.book_title}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                  <Users className="h-3.5 w-3.5" />
                  {club.member_count} member{club.member_count !== 1 ? "s" : ""}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Club Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-start justify-between">
              <CardTitle className="font-[family-name:var(--font-serif)] text-xl">
                Create Book Club
              </CardTitle>
              <button
                onClick={() => setCreateOpen(false)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Club Name</label>
                <Input
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  placeholder="e.g., The Page Turners"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Book (optional)
                </label>
                <select
                  value={selectedBookId}
                  onChange={(e) => setSelectedBookId(e.target.value)}
                  className="w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm"
                >
                  <option value="">No book selected</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={handleCreate}
                disabled={!clubName.trim() || submitting}
                className="w-full"
              >
                {submitting ? "Creating..." : "Create Club"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Join Club Modal */}
      {joinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex flex-row items-start justify-between">
              <CardTitle className="font-[family-name:var(--font-serif)] text-xl">
                Join Book Club
              </CardTitle>
              <button
                onClick={() => setJoinOpen(false)}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                <X className="h-5 w-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Invite Code</label>
                <Input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Paste invite code"
                />
              </div>
              <Button
                onClick={handleJoin}
                disabled={!inviteCode.trim() || submitting}
                className="w-full"
              >
                {submitting ? "Joining..." : "Join Club"}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
