"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";

export interface BookRow {
  id: string;
  user_id: string;
  ol_key: string | null;
  title: string;
  author: string | null;
  genre: string | null;
  cover_url: string | null;
  synopsis: string | null;
  status: "want_to_read" | "reading" | "finished";
  mood: "loved_it" | "it_was_fine" | "dnf" | null;
  progress: string | null;
  date_finished: string | null;
  created_at: string;
}

export function useBooks() {
  const [books, setBooks] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBooks = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("books")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching books:", error);
      return;
    }

    setBooks(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  async function addBook(book: {
    ol_key?: string;
    title: string;
    author?: string;
    genre?: string;
    cover_url?: string;
    synopsis?: string;
    status?: "want_to_read" | "reading" | "finished";
  }) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data, error } = await supabase
      .from("books")
      .insert({ ...book, user_id: user.id })
      .select()
      .single();

    if (error) return { error: error.message };

    setBooks((prev) => [data, ...prev]);
    return { data };
  }

  async function updateBook(
    id: string,
    updates: Partial<
      Pick<BookRow, "status" | "mood" | "progress" | "date_finished">
    >
  ) {
    const supabase = createClient();

    if (updates.status === "finished" && !updates.date_finished) {
      updates.date_finished = new Date().toISOString().split("T")[0];
    }

    const { data, error } = await supabase
      .from("books")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return { error: error.message };

    setBooks((prev) => prev.map((b) => (b.id === id ? data : b)));
    return { data };
  }

  return { books, loading, fetchBooks, addBook, updateBook };
}
