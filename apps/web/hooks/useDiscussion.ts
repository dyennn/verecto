"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { DiscussionGuide } from "@/lib/openrouter";

export interface DiscussionRow {
  id: string;
  user_id: string;
  book_id: string;
  model_used: string | null;
  content: DiscussionGuide;
  created_at: string;
}

export function useDiscussion() {
  const [discussion, setDiscussion] = useState<DiscussionRow | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchDiscussion = useCallback(async (bookId: string) => {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("discussions")
      .select("*")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching discussion:", error);
      setLoading(false);
      return;
    }

    setDiscussion(data);
    setLoading(false);
  }, []);

  async function generateDiscussion(bookId: string) {
    setGenerating(true);

    try {
      const res = await fetch("/api/discussion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        return { error: result.error || "Failed to generate discussion" };
      }

      setDiscussion(result.discussion);
      return { data: result.discussion };
    } catch (err) {
      console.error("Generate discussion error:", err);
      return { error: "Failed to generate discussion. Please try again." };
    } finally {
      setGenerating(false);
    }
  }

  return { discussion, loading, generating, fetchDiscussion, generateDiscussion };
}
