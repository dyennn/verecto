"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";

export interface ProfileRow {
  id: string;
  username: string | null;
  favorite_genres: string[];
  top_moods: string[];
  reading_streak: number;
  last_read_date: string | null;
  avatar_url: string | null;
  bio: string | null;
  reading_goal_per_year: number;
  discussion_style: "casual" | "academic" | "socratic" | null;
  created_at: string;
}

export function useProfile() {
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      return;
    }

    setProfile(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function updateProfile(updates: Partial<ProfileRow>) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { data, error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id)
      .select()
      .single();

    if (error) return { error: error.message };

    setProfile(data);
    return { data };
  }

  return { profile, loading, fetchProfile, updateProfile };
}
