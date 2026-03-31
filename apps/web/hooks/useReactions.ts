"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase";

const EMOJIS = ["💡", "❤️", "🔥", "👍", "👎"] as const;

export type ReactionEmoji = (typeof EMOJIS)[number];

// { "💡": ["userId1", "userId2"], ... }
export type ReactionsMap = Record<ReactionEmoji, string[]>;

function emptyMap(): ReactionsMap {
  return Object.fromEntries(EMOJIS.map((e) => [e, []])) as unknown as ReactionsMap;
}

export function useReactions(discussionId: string) {
  const [reactions, setReactions] = useState<ReactionsMap>(emptyMap);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReactions = useCallback(async () => {
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    setCurrentUserId(user?.id ?? null);

    const { data, error } = await supabase
      .from("discussion_reactions")
      .select("user_id, emoji")
      .eq("discussion_id", discussionId);

    if (error) {
      setLoading(false);
      return;
    }

    const map = emptyMap();
    for (const row of data ?? []) {
      const emoji = row.emoji as ReactionEmoji;
      if (map[emoji]) {
        map[emoji].push(row.user_id);
      }
    }
    setReactions(map);
    setLoading(false);
  }, [discussionId]);

  useEffect(() => {
    fetchReactions();
  }, [fetchReactions]);

  const toggle = useCallback(
    async (emoji: ReactionEmoji) => {
      if (!currentUserId) return;
      const supabase = createClient();

      const alreadyReacted = reactions[emoji].includes(currentUserId);

      // Optimistic update
      setReactions((prev) => {
        const next = { ...prev, [emoji]: [...prev[emoji]] };
        if (alreadyReacted) {
          next[emoji] = next[emoji].filter((id) => id !== currentUserId);
        } else {
          next[emoji] = [...next[emoji], currentUserId];
        }
        return next;
      });

      if (alreadyReacted) {
        await supabase
          .from("discussion_reactions")
          .delete()
          .eq("discussion_id", discussionId)
          .eq("user_id", currentUserId)
          .eq("emoji", emoji);
      } else {
        await supabase
          .from("discussion_reactions")
          .insert({ discussion_id: discussionId, user_id: currentUserId, emoji });
      }
    },
    [discussionId, currentUserId, reactions]
  );

  return { reactions, toggle, loading, currentUserId };
}
