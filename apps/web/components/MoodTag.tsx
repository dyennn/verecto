"use client";

import { cn } from "@/lib/utils";

type Mood = "loved_it" | "it_was_fine" | "dnf";

interface MoodTagProps {
  mood: Mood | null;
  onSelect: (mood: Mood) => void;
  disabled?: boolean;
}

const moods: { value: Mood; label: string }[] = [
  { value: "loved_it", label: "Loved it \u{1F49B}" },
  { value: "it_was_fine", label: "It was fine \u{1F937}" },
  { value: "dnf", label: "DNF \u{1F4D5}" },
];

export function MoodTag({ mood, onSelect, disabled }: MoodTagProps) {
  return (
    <div className="flex gap-2">
      {moods.map((m) => (
        <button
          key={m.value}
          disabled={disabled}
          onClick={() => onSelect(m.value)}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-all",
            mood === m.value
              ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]"
              : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/40 hover:text-[var(--foreground)]",
            disabled && "pointer-events-none opacity-50"
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
