import type { BookRow } from "@/hooks/useBooks";

export interface MonthlyCount {
  month: string; // "Jan", "Feb", etc.
  year: number;
  count: number;
}

export interface MoodCount {
  mood: string;
  label: string;
  count: number;
  percent: number;
}

export interface GenreCount {
  genre: string;
  count: number;
}

export function getBooksFinishedPerMonth(books: BookRow[]): MonthlyCount[] {
  const finished = books.filter(
    (b) => b.status === "finished" && b.date_finished
  );

  const now = new Date();
  const months: MonthlyCount[] = [];

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      month: d.toLocaleString("en-US", { month: "short" }),
      year: d.getFullYear(),
      count: 0,
    });
  }

  for (const book of finished) {
    const d = new Date(book.date_finished!);
    const monthStr = d.toLocaleString("en-US", { month: "short" });
    const year = d.getFullYear();
    const entry = months.find((m) => m.month === monthStr && m.year === year);
    if (entry) entry.count++;
  }

  return months;
}

export function getMoodBreakdown(books: BookRow[]): MoodCount[] {
  const finished = books.filter(
    (b) => b.status === "finished" && b.mood
  );
  const total = finished.length || 1;

  const counts: Record<string, number> = {
    loved_it: 0,
    it_was_fine: 0,
    dnf: 0,
  };

  for (const book of finished) {
    if (book.mood && counts[book.mood] !== undefined) {
      counts[book.mood]++;
    }
  }

  const labels: Record<string, string> = {
    loved_it: "Loved It",
    it_was_fine: "It Was Fine",
    dnf: "DNF",
  };

  // Largest-remainder method so percents always sum to exactly 100
  const entries = Object.entries(counts).map(([mood, count]) => {
    const exact = (count / total) * 100;
    return {
      mood,
      label: labels[mood] || mood,
      count,
      exact,
      floor: Math.floor(exact),
      remainder: exact - Math.floor(exact),
    };
  });

  const floored = entries.reduce((sum, e) => sum + e.floor, 0);
  const toDistribute = 100 - floored;
  const sorted = entries.slice().sort((a, b) => b.remainder - a.remainder);

  return entries.map((entry) => {
    const rank = sorted.findIndex((e) => e.mood === entry.mood);
    return {
      mood: entry.mood,
      label: entry.label,
      count: entry.count,
      percent: entry.floor + (rank < toDistribute ? 1 : 0),
    };
  });
}

export function getGenreBreakdown(books: BookRow[]): GenreCount[] {
  const finished = books.filter((b) => b.status === "finished");
  const counts: Record<string, number> = {};

  for (const book of finished) {
    const genre = book.genre || "Unknown";
    counts[genre] = (counts[genre] || 0) + 1;
  }

  return Object.entries(counts)
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export function getReadingStreak(
  books: BookRow[]
): { current: number; longest: number } {
  const dates = books
    .filter((b) => b.status === "finished" && b.date_finished)
    .map((b) => b.date_finished!)
    .sort()
    .reverse();

  if (dates.length === 0) return { current: 0, longest: 0 };

  // Deduplicate dates
  const unique = [...new Set(dates)];

  let current = 0;
  let longest = 0;
  let streak = 1;

  // Check if most recent finish was within the last 30 days for "current" streak
  const today = new Date();
  const lastFinish = new Date(unique[0]);
  const daysSinceLast = Math.floor(
    (today.getTime() - lastFinish.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate streaks based on consecutive months with finishes
  const monthKeys = unique.map((d) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${dt.getMonth()}`;
  });
  const uniqueMonths = [...new Set(monthKeys)];

  for (let i = 1; i < uniqueMonths.length; i++) {
    const [y1, m1] = uniqueMonths[i - 1].split("-").map(Number);
    const [y2, m2] = uniqueMonths[i].split("-").map(Number);
    const diff = (y1 - y2) * 12 + (m1 - m2);
    if (diff === 1) {
      streak++;
    } else {
      longest = Math.max(longest, streak);
      streak = 1;
    }
  }
  longest = Math.max(longest, streak);

  // Current streak: count consecutive months from now backwards
  current = 0;
  if (daysSinceLast <= 45) {
    current = 1;
    for (let i = 1; i < uniqueMonths.length; i++) {
      const [y1, m1] = uniqueMonths[i - 1].split("-").map(Number);
      const [y2, m2] = uniqueMonths[i].split("-").map(Number);
      const diff = (y1 - y2) * 12 + (m1 - m2);
      if (diff === 1) {
        current++;
      } else {
        break;
      }
    }
  }

  return { current, longest };
}

export function getReadingActivityByDay(
  books: BookRow[]
): Record<string, number> {
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - 52 * 7);
  cutoff.setUTCHours(0, 0, 0, 0);

  const result: Record<string, number> = {};

  for (const book of books) {
    if (book.status !== "finished" || !book.date_finished) continue;
    const d = new Date(book.date_finished);
    if (d < cutoff) continue;
    result[book.date_finished] = (result[book.date_finished] || 0) + 1;
  }

  return result;
}

export function getYearlyProgress(
  books: BookRow[],
  goal: number
): { finished: number; goal: number } {
  const year = new Date().getFullYear();
  const finished = books.filter((b) => {
    if (b.status !== "finished" || !b.date_finished) return false;
    return new Date(b.date_finished).getFullYear() === year;
  }).length;

  return { finished, goal };
}
