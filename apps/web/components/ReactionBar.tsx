"use client";

import { useReactions, type ReactionEmoji } from "@/hooks/useReactions";

const EMOJIS: ReactionEmoji[] = ["💡", "❤️", "🔥", "👍", "👎"];

interface ReactionBarProps {
  discussionId: string;
}

export function ReactionBar({ discussionId }: ReactionBarProps) {
  const { reactions, toggle, loading, currentUserId } = useReactions(discussionId);

  if (loading) return null;

  return (
    <div className="flex flex-wrap gap-1.5 pt-2">
      {EMOJIS.map((emoji) => {
        const count = reactions[emoji].length;
        const reacted = currentUserId
          ? reactions[emoji].includes(currentUserId)
          : false;

        return (
          <button
            key={emoji}
            onClick={() => toggle(emoji)}
            className={[
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-sm transition-colors",
              reacted
                ? "bg-[var(--primary)]/15 ring-1 ring-[var(--primary)]"
                : "bg-[var(--secondary)] hover:bg-[var(--secondary)]/80",
            ].join(" ")}
            title={reacted ? "Remove reaction" : "Add reaction"}
          >
            <span>{emoji}</span>
            {count > 0 && (
              <span className="text-xs font-medium text-[var(--foreground)]">
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
