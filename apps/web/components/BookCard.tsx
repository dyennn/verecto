"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

interface BookCardProps {
  title: string;
  author: string;
  coverUrl: string | null;
  status?: "want_to_read" | "reading" | "finished";
  mood?: "loved_it" | "it_was_fine" | "dnf" | null;
  onClick?: () => void;
}

const statusLabels: Record<string, string> = {
  want_to_read: "Want to Read",
  reading: "Reading",
  finished: "Finished",
};

const moodEmojis: Record<string, string> = {
  loved_it: "Loved it \u{1F49B}",
  it_was_fine: "It was fine \u{1F937}",
  dnf: "DNF \u{1F4D5}",
};

export function BookCard({
  title,
  author,
  coverUrl,
  status,
  mood,
  onClick,
}: BookCardProps) {
  return (
    <Card
      className="flex cursor-pointer gap-4 p-4 transition-colors hover:border-[var(--primary)]/40"
      onClick={onClick}
    >
      <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded bg-[var(--secondary)]">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="80px"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-[var(--muted-foreground)]">
            No Cover
          </div>
        )}
      </div>
      <div className="flex flex-col justify-center gap-1 overflow-hidden">
        <h3 className="truncate font-[family-name:var(--font-serif)] text-lg font-semibold">
          {title}
        </h3>
        <p className="truncate text-sm text-[var(--muted-foreground)]">
          {author}
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {status && (
            <Badge variant="secondary" className="text-xs">
              {statusLabels[status]}
            </Badge>
          )}
          {mood && (
            <Badge variant="outline" className="text-xs">
              {moodEmojis[mood]}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
