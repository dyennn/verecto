"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";
import type { RecommendedBook } from "@/app/api/recommendations/route";

export type { RecommendedBook };

export function useRecommendations() {
  const [recommendations, setRecommendations] = useState<RecommendedBook[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const fetchRecommendations = useCallback(async (bookId: string) => {
    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from("recommendations")
      .select("recommended_books")
      .eq("user_id", user.id)
      .eq("book_id", bookId)
      .single();

    if (data) {
      setRecommendations(data.recommended_books as RecommendedBook[]);
    }
    setLoading(false);
  }, []);

  const generateRecommendations = useCallback(async (bookId: string) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookId }),
      });
      const json = await res.json();
      if (json.success) {
        setRecommendations(json.recommendations as RecommendedBook[]);
      }
    } finally {
      setGenerating(false);
    }
  }, []);

  return {
    recommendations,
    loading,
    generating,
    fetchRecommendations,
    generateRecommendations,
  };
}
