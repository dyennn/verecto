"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useProfile } from "@/hooks/useProfile";
import { SettingsSubNav } from "@/app/(app)/settings/page";
import { createClient } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { User, Check, X, Loader2, MessageSquare } from "lucide-react";

type DiscussionStyle = "casual" | "academic" | "socratic";

const STYLE_OPTIONS: { value: DiscussionStyle; label: string; description: string }[] = [
  {
    value: "casual",
    label: "Casual",
    description: "Like chatting with friends in a book club",
  },
  {
    value: "academic",
    label: "Academic",
    description: "Literary analysis with themes and symbolism",
  },
  {
    value: "socratic",
    label: "Socratic",
    description: "Questions only — you find the answers",
  },
];

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfilePage() {
  const { profile, loading, updateProfile } = useProfile();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [readingGoal, setReadingGoal] = useState(12);
  const [discussionStyle, setDiscussionStyle] = useState<DiscussionStyle>("casual");
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken" | "saved" | "error"
  >("idle");
  const [bioStatus, setBioStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [goalStatus, setGoalStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [styleStatus, setStyleStatus] = useState<"idle" | "saving" | "saved">("idle");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hydrate from profile
  useEffect(() => {
    if (profile) {
      setUsername(profile.username || "");
      setBio(profile.bio || "");
      setReadingGoal(profile.reading_goal_per_year ?? 12);
      setDiscussionStyle(profile.discussion_style ?? "casual");
    }
  }, [profile]);

  // Username uniqueness check (debounced)
  const checkUsername = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (!value.trim() || value === profile?.username) {
        setUsernameStatus("idle");
        return;
      }

      setUsernameStatus("checking");
      debounceRef.current = setTimeout(async () => {
        const supabase = createClient();
        const { data } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", value.trim())
          .neq("id", profile?.id ?? "")
          .maybeSingle();

        setUsernameStatus(data ? "taken" : "available");
      }, 500);
    },
    [profile?.username, profile?.id]
  );

  async function saveUsername() {
    if (usernameStatus === "taken" || !username.trim()) return;

    const result = await updateProfile({ username: username.trim() });
    if (result?.error) {
      setUsernameStatus("error");
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      setUsernameStatus("saved");
      setTimeout(() => setUsernameStatus("idle"), 2000);
    }
  }

  async function saveBio() {
    setBioStatus("saving");
    const result = await updateProfile({ bio: bio.trim() || null } as Partial<typeof profile & { bio: string | null }>);
    if (result?.error) {
      setBioStatus("error");
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      setBioStatus("saved");
      setTimeout(() => setBioStatus("idle"), 2000);
    }
  }

  async function saveReadingGoal() {
    const clamped = Math.max(1, Math.min(365, readingGoal));
    setReadingGoal(clamped);
    setGoalStatus("saving");
    const result = await updateProfile({ reading_goal_per_year: clamped } as Partial<typeof profile & { reading_goal_per_year: number }>);
    if (result?.error) {
      setGoalStatus("error");
      toast({ title: "Error", description: result.error, variant: "destructive" });
    } else {
      setGoalStatus("saved");
      setTimeout(() => setGoalStatus("idle"), 2000);
    }
  }

  async function saveDiscussionStyle(style: DiscussionStyle) {
    setDiscussionStyle(style);
    setStyleStatus("saving");
    const result = await updateProfile({ discussion_style: style } as Partial<typeof profile & { discussion_style: DiscussionStyle }>);
    if (result?.error) {
      toast({ title: "Error", description: result.error, variant: "destructive" });
      setStyleStatus("idle");
    } else {
      setStyleStatus("saved");
      setTimeout(() => setStyleStatus("idle"), 2000);
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
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl font-bold">
        Settings
      </h1>

      <SettingsSubNav />

      {/* Avatar */}
      <div className="flex items-center gap-4">
        <div
          className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold"
          style={{
            backgroundColor: "var(--primary)",
            color: "var(--primary-foreground)",
          }}
        >
          {getInitials(username || profile?.username)}
        </div>
        <div>
          <p className="text-lg font-semibold">
            {username || profile?.username || "Set your username"}
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            Your reading companion profile
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-[family-name:var(--font-serif)] text-xl">
            <User className="h-5 w-5 text-[var(--primary)]" />
            Profile Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Username */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <div className="relative">
              <Input
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  checkUsername(e.target.value);
                }}
                onBlur={saveUsername}
                placeholder="Choose a username"
                maxLength={30}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {usernameStatus === "checking" && (
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--muted-foreground)]" />
                )}
                {usernameStatus === "available" && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
                {usernameStatus === "taken" && (
                  <X className="h-4 w-4 text-red-500" />
                )}
                {usernameStatus === "saved" && (
                  <Check className="h-4 w-4 text-green-500" />
                )}
              </div>
            </div>
            {usernameStatus === "taken" && (
              <p className="text-xs text-red-500">Username is already taken</p>
            )}
            {usernameStatus === "saved" && (
              <p className="text-xs text-green-500">Saved</p>
            )}
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Bio</label>
              <span className="text-xs text-[var(--muted-foreground)]">
                {bio.length}/160
              </span>
            </div>
            <textarea
              value={bio}
              onChange={(e) => {
                if (e.target.value.length <= 160) setBio(e.target.value);
              }}
              onBlur={saveBio}
              placeholder="Tell us about your reading life..."
              rows={3}
              className="w-full rounded-md border border-[var(--input)] bg-transparent px-3 py-2 text-sm placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--ring)]"
            />
            {bioStatus === "saved" && (
              <p className="text-xs text-green-500">Saved</p>
            )}
          </div>

          {/* Reading Goal */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Yearly Reading Goal
            </label>
            <p className="text-xs text-[var(--muted-foreground)]">
              How many books do you want to finish this year?
            </p>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                min={1}
                max={365}
                value={readingGoal}
                onChange={(e) => setReadingGoal(Number(e.target.value))}
                onBlur={saveReadingGoal}
                className="w-24"
              />
              <span className="text-sm text-[var(--muted-foreground)]">
                books per year
              </span>
              {goalStatus === "saved" && (
                <Check className="h-4 w-4 text-green-500" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Discussion Style */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-[family-name:var(--font-serif)] text-xl">
            <MessageSquare className="h-5 w-5 text-[var(--primary)]" />
            Discussion Style
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-[var(--muted-foreground)]">
            How should the AI shape your discussion guides?
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {STYLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => saveDiscussionStyle(option.value)}
                className={`rounded-lg border p-4 text-left transition-colors ${
                  discussionStyle === option.value
                    ? "border-[var(--primary)] bg-[var(--primary)]/10"
                    : "border-[var(--border)] hover:border-[var(--primary)]/40"
                }`}
              >
                <p className="text-sm font-semibold">{option.label}</p>
                <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                  {option.description}
                </p>
                {discussionStyle === option.value && (
                  <div className="mt-2 flex items-center gap-1">
                    <div
                      className="h-2 w-2 rounded-full"
                      style={{ backgroundColor: "var(--primary)" }}
                    />
                    <span className="text-xs" style={{ color: "var(--primary)" }}>
                      {styleStatus === "saved" ? "Saved" : "Active"}
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
