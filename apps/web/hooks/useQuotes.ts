"use client";

import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase";

export interface QuoteRow {
  id: string;
  user_id: string;
  book_id: string;
  text: string;
  page_number: number | null;
  created_at: string;
}

export function useQuotes(bookId: string) {
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .eq("book_id", bookId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching quotes:", error);
      setLoading(false);
      return;
    }

    setQuotes(data ?? []);
    setLoading(false);
  }, [bookId]);

  async function addQuote(text: string, pageNumber?: number) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data, error } = await supabase
      .from("quotes")
      .insert({
        user_id: user.id,
        book_id: bookId,
        text: text.trim(),
        page_number: pageNumber ?? null,
      })
      .select()
      .single();

    if (error) return { error: error.message };

    setQuotes((prev) => [data, ...prev]);
    return { data };
  }

  async function deleteQuote(quoteId: string) {
    const supabase = createClient();

    const { error } = await supabase
      .from("quotes")
      .delete()
      .eq("id", quoteId);

    if (error) return { error: error.message };

    setQuotes((prev) => prev.filter((q) => q.id !== quoteId));
    return {};
  }

  return { quotes, loading, fetchQuotes, addQuote, deleteQuote };
}
