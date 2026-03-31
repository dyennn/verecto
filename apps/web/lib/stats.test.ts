import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { BookRow } from "@/hooks/useBooks";
import {
  getBooksFinishedPerMonth,
  getMoodBreakdown,
  getGenreBreakdown,
  getReadingStreak,
  getYearlyProgress,
  getReadingActivityByDay,
} from "@/lib/stats";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

let _idCounter = 0;

function makeBook(overrides: Partial<BookRow> = {}): BookRow {
  _idCounter++;
  return {
    id: `book-${_idCounter}`,
    user_id: "user-1",
    ol_key: null,
    title: `Test Book ${_idCounter}`,
    author: "Test Author",
    genre: null,
    cover_url: null,
    synopsis: null,
    status: "finished",
    mood: null,
    progress: null,
    date_finished: null,
    current_chapter: null,
    total_chapters: null,
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Fixed "now" used across all time-dependent tests: 2026-03-31
// ---------------------------------------------------------------------------
const FIXED_NOW = new Date("2026-03-31T12:00:00Z");

beforeEach(() => {
  _idCounter = 0;
  vi.useFakeTimers();
  vi.setSystemTime(FIXED_NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

// ===========================================================================
// getBooksFinishedPerMonth
// ===========================================================================

describe("getBooksFinishedPerMonth", () => {
  it("returns exactly 12 entries for an empty books array", () => {
    const result = getBooksFinishedPerMonth([]);
    expect(result).toHaveLength(12);
  });

  it("all counts are zero when books array is empty", () => {
    const result = getBooksFinishedPerMonth([]);
    expect(result.every((m) => m.count === 0)).toBe(true);
  });

  it("returns months in chronological order oldest-to-newest", () => {
    // Fixed now = 2026-03: oldest should be Apr 2025, newest Mar 2026
    const result = getBooksFinishedPerMonth([]);
    expect(result[0].month).toBe("Apr");
    expect(result[0].year).toBe(2025);
    expect(result[11].month).toBe("Mar");
    expect(result[11].year).toBe(2026);
  });

  it("counts a finished book in the correct month", () => {
    const books = [
      makeBook({ status: "finished", date_finished: "2026-01-15" }),
    ];
    const result = getBooksFinishedPerMonth(books);
    const jan2026 = result.find((m) => m.month === "Jan" && m.year === 2026);
    expect(jan2026?.count).toBe(1);
  });

  it("counts multiple books in the same month", () => {
    const books = [
      makeBook({ status: "finished", date_finished: "2025-11-03" }),
      makeBook({ status: "finished", date_finished: "2025-11-17" }),
      makeBook({ status: "finished", date_finished: "2025-11-28" }),
    ];
    const result = getBooksFinishedPerMonth(books);
    const nov2025 = result.find((m) => m.month === "Nov" && m.year === 2025);
    expect(nov2025?.count).toBe(3);
  });

  it("counts books across different months correctly", () => {
    const books = [
      makeBook({ status: "finished", date_finished: "2026-02-10" }),
      makeBook({ status: "finished", date_finished: "2026-03-05" }),
      makeBook({ status: "finished", date_finished: "2026-03-20" }),
    ];
    const result = getBooksFinishedPerMonth(books);
    const feb2026 = result.find((m) => m.month === "Feb" && m.year === 2026);
    const mar2026 = result.find((m) => m.month === "Mar" && m.year === 2026);
    expect(feb2026?.count).toBe(1);
    expect(mar2026?.count).toBe(2);
  });

  it("ignores books with status other than finished", () => {
    const books = [
      makeBook({ status: "reading", date_finished: null }),
      makeBook({ status: "want_to_read", date_finished: null }),
    ];
    const result = getBooksFinishedPerMonth(books);
    expect(result.every((m) => m.count === 0)).toBe(true);
  });

  it("ignores finished books without a date_finished", () => {
    const books = [makeBook({ status: "finished", date_finished: null })];
    const result = getBooksFinishedPerMonth(books);
    expect(result.every((m) => m.count === 0)).toBe(true);
  });

  it("ignores books with date_finished outside the 12-month window", () => {
    // Apr 2025 is the oldest bucket; Mar 2025 is one month before that
    const books = [
      makeBook({ status: "finished", date_finished: "2025-03-31" }),
      makeBook({ status: "finished", date_finished: "2020-06-15" }),
    ];
    const result = getBooksFinishedPerMonth(books);
    expect(result.every((m) => m.count === 0)).toBe(true);
  });

  it("includes a book on the exact first day of the oldest month", () => {
    const books = [
      makeBook({ status: "finished", date_finished: "2025-04-01" }),
    ];
    const result = getBooksFinishedPerMonth(books);
    const apr2025 = result.find((m) => m.month === "Apr" && m.year === 2025);
    expect(apr2025?.count).toBe(1);
  });
});

// ===========================================================================
// getMoodBreakdown
// ===========================================================================

describe("getMoodBreakdown", () => {
  it("returns three mood entries for an empty books array", () => {
    const result = getMoodBreakdown([]);
    expect(result).toHaveLength(3);
  });

  it("returns the correct mood keys", () => {
    const result = getMoodBreakdown([]);
    const moods = result.map((m) => m.mood);
    expect(moods).toContain("loved_it");
    expect(moods).toContain("it_was_fine");
    expect(moods).toContain("dnf");
  });

  it("all counts are zero for an empty books array", () => {
    const result = getMoodBreakdown([]);
    expect(result.every((m) => m.count === 0)).toBe(true);
  });

  it("counts reflect actual book moods", () => {
    const books = [
      makeBook({ status: "finished", mood: "loved_it" }),
      makeBook({ status: "finished", mood: "loved_it" }),
      makeBook({ status: "finished", mood: "it_was_fine" }),
    ];
    const result = getMoodBreakdown(books);
    expect(result.find((m) => m.mood === "loved_it")?.count).toBe(2);
    expect(result.find((m) => m.mood === "it_was_fine")?.count).toBe(1);
    expect(result.find((m) => m.mood === "dnf")?.count).toBe(0);
  });

  it("calculates percentages correctly", () => {
    const books = [
      makeBook({ status: "finished", mood: "loved_it" }),
      makeBook({ status: "finished", mood: "loved_it" }),
      makeBook({ status: "finished", mood: "loved_it" }),
      makeBook({ status: "finished", mood: "it_was_fine" }),
    ];
    const result = getMoodBreakdown(books);
    expect(result.find((m) => m.mood === "loved_it")?.percent).toBe(75);
    expect(result.find((m) => m.mood === "it_was_fine")?.percent).toBe(25);
    expect(result.find((m) => m.mood === "dnf")?.percent).toBe(0);
  });

  it("percentages sum to 100 for a uniform distribution", () => {
    const books = [
      makeBook({ status: "finished", mood: "loved_it" }),
      makeBook({ status: "finished", mood: "it_was_fine" }),
      makeBook({ status: "finished", mood: "dnf" }),
    ];
    const result = getMoodBreakdown(books);
    const total = result.reduce((acc, m) => acc + m.percent, 0);
    expect(total).toBe(100);
  });

  it("returns correct human-readable labels", () => {
    const result = getMoodBreakdown([]);
    expect(result.find((m) => m.mood === "loved_it")?.label).toBe("Loved It");
    expect(result.find((m) => m.mood === "it_was_fine")?.label).toBe(
      "It Was Fine"
    );
    expect(result.find((m) => m.mood === "dnf")?.label).toBe("DNF");
  });

  it("ignores non-finished books when computing mood", () => {
    const books = [
      makeBook({ status: "reading", mood: "loved_it" }),
      makeBook({ status: "want_to_read", mood: "it_was_fine" }),
    ];
    const result = getMoodBreakdown(books);
    expect(result.every((m) => m.count === 0)).toBe(true);
  });

  it("ignores finished books with null mood", () => {
    const books = [
      makeBook({ status: "finished", mood: null }),
      makeBook({ status: "finished", mood: "loved_it" }),
    ];
    const result = getMoodBreakdown(books);
    // Only 1 book has a mood; percent is out of 1
    expect(result.find((m) => m.mood === "loved_it")?.percent).toBe(100);
  });

  it("does not divide by zero when all books have null mood", () => {
    const books = [
      makeBook({ status: "finished", mood: null }),
      makeBook({ status: "finished", mood: null }),
    ];
    expect(() => getMoodBreakdown(books)).not.toThrow();
    const result = getMoodBreakdown(books);
    expect(result.every((m) => m.count === 0)).toBe(true);
  });

  it("ignores finished books with an unrecognized mood value", () => {
    // mood is truthy but not in the counts map — exercises the
    // `counts[book.mood] !== undefined` false branch.
    // The unrecognized "meh" book still contributes to `finished.length`
    // (because it passes the `b.status === 'finished' && b.mood` filter),
    // so total = 2 and loved_it = 1/2 = 51% after largest-remainder.
    const books = [
      makeBook({ status: "finished", mood: "meh" as unknown as null }),
      makeBook({ status: "finished", mood: "loved_it" }),
    ];
    const result = getMoodBreakdown(books);
    // Recognized count for loved_it is 1; unrecognized "meh" is silently skipped
    // in the counts increment but still counted toward `total`.
    expect(result.find((m) => m.mood === "loved_it")?.count).toBe(1);
    // The unrecognized mood is NOT returned as a separate entry
    expect(result.find((m) => m.mood === "meh")).toBeUndefined();
    // There are still exactly 3 entries (the fixed mood keys)
    expect(result).toHaveLength(3);
  });

  it("largest-remainder method distributes remainder correctly with 7 books", () => {
    // 4 loved_it, 2 it_was_fine, 1 dnf → 7 books
    // exact: 57.14%, 28.57%, 14.28% — floors sum to 99, one remainder needed
    const books = [
      makeBook({ status: "finished", mood: "loved_it" }),
      makeBook({ status: "finished", mood: "loved_it" }),
      makeBook({ status: "finished", mood: "loved_it" }),
      makeBook({ status: "finished", mood: "loved_it" }),
      makeBook({ status: "finished", mood: "it_was_fine" }),
      makeBook({ status: "finished", mood: "it_was_fine" }),
      makeBook({ status: "finished", mood: "dnf" }),
    ];
    const result = getMoodBreakdown(books);
    const total = result.reduce((acc, m) => acc + m.percent, 0);
    expect(total).toBe(100);
  });
});

// ===========================================================================
// getGenreBreakdown
// ===========================================================================

describe("getGenreBreakdown", () => {
  it("returns an empty array for an empty books array", () => {
    expect(getGenreBreakdown([])).toEqual([]);
  });

  it("returns only finished books in genre counts", () => {
    const books = [
      makeBook({ status: "reading", genre: "Fantasy" }),
      makeBook({ status: "want_to_read", genre: "Fantasy" }),
      makeBook({ status: "finished", genre: "Fantasy" }),
    ];
    const result = getGenreBreakdown(books);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ genre: "Fantasy", count: 1 });
  });

  it("treats null genre as 'Unknown'", () => {
    const books = [makeBook({ status: "finished", genre: null })];
    const result = getGenreBreakdown(books);
    expect(result[0].genre).toBe("Unknown");
  });

  it("sorts genres by count descending", () => {
    const books = [
      makeBook({ status: "finished", genre: "Fantasy" }),
      makeBook({ status: "finished", genre: "Science Fiction" }),
      makeBook({ status: "finished", genre: "Science Fiction" }),
      makeBook({ status: "finished", genre: "Fantasy" }),
      makeBook({ status: "finished", genre: "Science Fiction" }),
      makeBook({ status: "finished", genre: "Horror" }),
    ];
    const result = getGenreBreakdown(books);
    expect(result[0].genre).toBe("Science Fiction");
    expect(result[0].count).toBe(3);
    expect(result[1].genre).toBe("Fantasy");
    expect(result[1].count).toBe(2);
    expect(result[2].genre).toBe("Horror");
    expect(result[2].count).toBe(1);
  });

  it("limits the result to 5 genres", () => {
    const genres = [
      "Fantasy",
      "Sci-Fi",
      "Horror",
      "Romance",
      "Thriller",
      "Mystery",
    ];
    const books = genres.map((genre) => makeBook({ status: "finished", genre }));
    const result = getGenreBreakdown(books);
    expect(result).toHaveLength(5);
  });

  it("returns fewer than 5 when there are fewer distinct genres", () => {
    const books = [
      makeBook({ status: "finished", genre: "Fantasy" }),
      makeBook({ status: "finished", genre: "Horror" }),
    ];
    const result = getGenreBreakdown(books);
    expect(result).toHaveLength(2);
  });

  it("aggregates multiple books of the same genre", () => {
    const books = Array.from({ length: 5 }, () =>
      makeBook({ status: "finished", genre: "Fantasy" })
    );
    const result = getGenreBreakdown(books);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ genre: "Fantasy", count: 5 });
  });

  it("Unknown genre groups all null-genre books together", () => {
    const books = [
      makeBook({ status: "finished", genre: null }),
      makeBook({ status: "finished", genre: null }),
      makeBook({ status: "finished", genre: "Fantasy" }),
    ];
    const result = getGenreBreakdown(books);
    const unknown = result.find((g) => g.genre === "Unknown");
    expect(unknown?.count).toBe(2);
  });
});

// ===========================================================================
// getReadingStreak
// ===========================================================================

describe("getReadingStreak", () => {
  it("returns { current: 0, longest: 0 } for an empty books array", () => {
    expect(getReadingStreak([])).toEqual({ current: 0, longest: 0 });
  });

  it("returns { current: 0, longest: 0 } when no books are finished", () => {
    const books = [
      makeBook({ status: "reading", date_finished: null }),
      makeBook({ status: "want_to_read", date_finished: null }),
    ];
    expect(getReadingStreak(books)).toEqual({ current: 0, longest: 0 });
  });

  it("returns { current: 1, longest: 1 } for a single recent finished book", () => {
    // Finished within the last 45 days relative to FIXED_NOW (2026-03-31)
    const books = [
      makeBook({ status: "finished", date_finished: "2026-03-15" }),
    ];
    expect(getReadingStreak(books)).toEqual({ current: 1, longest: 1 });
  });

  it("current streak is 0 when most recent finish is older than 45 days", () => {
    // 60 days before 2026-03-31 => 2026-01-30
    const books = [
      makeBook({ status: "finished", date_finished: "2026-01-30" }),
    ];
    const result = getReadingStreak(books);
    expect(result.current).toBe(0);
  });

  it("longest streak is still counted when current is 0", () => {
    // Two consecutive months, both old (> 45 days before now)
    const books = [
      makeBook({ status: "finished", date_finished: "2025-10-15" }),
      makeBook({ status: "finished", date_finished: "2025-11-20" }),
    ];
    const result = getReadingStreak(books);
    expect(result.longest).toBe(2);
    expect(result.current).toBe(0);
  });

  it("counts consecutive months as a streak", () => {
    // Jan, Feb, Mar 2026 — all within 45 days of Mar-31
    const books = [
      makeBook({ status: "finished", date_finished: "2026-01-10" }),
      makeBook({ status: "finished", date_finished: "2026-02-15" }),
      makeBook({ status: "finished", date_finished: "2026-03-20" }),
    ];
    const result = getReadingStreak(books);
    expect(result.current).toBe(3);
    expect(result.longest).toBe(3);
  });

  it("resets streak on a gap between months", () => {
    // Jan then Mar (gap in Feb) — neither chain reaches the current month
    const books = [
      makeBook({ status: "finished", date_finished: "2025-07-10" }),
      makeBook({ status: "finished", date_finished: "2025-08-15" }),
      // gap in Sep
      makeBook({ status: "finished", date_finished: "2025-10-20" }),
    ];
    const result = getReadingStreak(books);
    // Longest chain is 2 (Jul+Aug or just Oct alone; Jul+Aug = 2)
    expect(result.longest).toBe(2);
  });

  it("multiple books in the same month count as one streak-month", () => {
    const books = [
      makeBook({ status: "finished", date_finished: "2026-02-01" }),
      makeBook({ status: "finished", date_finished: "2026-02-28" }),
      makeBook({ status: "finished", date_finished: "2026-03-15" }),
    ];
    const result = getReadingStreak(books);
    // Feb + Mar = 2 consecutive months
    expect(result.current).toBe(2);
    expect(result.longest).toBe(2);
  });

  it("current streak from most recent contiguous months back from now", () => {
    // Nov and Dec form one chain; Jan 2026 is missing (gap); Feb and Mar form the current chain
    const books = [
      makeBook({ status: "finished", date_finished: "2025-11-10" }),
      makeBook({ status: "finished", date_finished: "2025-12-10" }),
      // gap (Jan 2026 missing)
      makeBook({ status: "finished", date_finished: "2026-02-20" }),
      makeBook({ status: "finished", date_finished: "2026-03-25" }),
    ];
    const result = getReadingStreak(books);
    // Current chain anchored at Mar is Mar+Feb = 2
    expect(result.current).toBe(2);
    // Longest chain is Nov+Dec = 2, or Feb+Mar = 2
    expect(result.longest).toBe(2);
  });
});

// ===========================================================================
// getYearlyProgress
// ===========================================================================

describe("getYearlyProgress", () => {
  it("returns { finished: 0, goal } for an empty books array", () => {
    expect(getYearlyProgress([], 12)).toEqual({ finished: 0, goal: 12 });
  });

  it("returns the goal unchanged", () => {
    expect(getYearlyProgress([], 24).goal).toBe(24);
  });

  it("counts finished books in the current year (2026)", () => {
    const books = [
      makeBook({ status: "finished", date_finished: "2026-01-10" }),
      makeBook({ status: "finished", date_finished: "2026-03-01" }),
    ];
    expect(getYearlyProgress(books, 10)).toEqual({ finished: 2, goal: 10 });
  });

  it("excludes finished books from previous years", () => {
    const books = [
      makeBook({ status: "finished", date_finished: "2025-12-31" }),
      makeBook({ status: "finished", date_finished: "2024-06-15" }),
    ];
    expect(getYearlyProgress(books, 5).finished).toBe(0);
  });

  it("excludes non-finished books even if date_finished is set", () => {
    const books = [
      makeBook({ status: "reading", date_finished: "2026-02-01" }),
      makeBook({ status: "want_to_read", date_finished: "2026-03-01" }),
    ];
    expect(getYearlyProgress(books, 5).finished).toBe(0);
  });

  it("excludes finished books with null date_finished", () => {
    const books = [makeBook({ status: "finished", date_finished: null })];
    expect(getYearlyProgress(books, 5).finished).toBe(0);
  });

  it("handles a mix of years, statuses, and null dates", () => {
    const books = [
      makeBook({ status: "finished", date_finished: "2026-01-01" }), // counts
      makeBook({ status: "finished", date_finished: "2025-12-01" }), // old year
      makeBook({ status: "finished", date_finished: null }),          // no date
      makeBook({ status: "reading", date_finished: null }),           // not finished
      makeBook({ status: "finished", date_finished: "2026-03-30" }), // counts
    ];
    expect(getYearlyProgress(books, 15).finished).toBe(2);
  });

  it("goal of 0 is preserved", () => {
    expect(getYearlyProgress([], 0).goal).toBe(0);
  });
});

// ===========================================================================
// getReadingActivityByDay
// ===========================================================================

describe("getReadingActivityByDay", () => {
  it("returns empty object for an empty books array", () => {
    expect(getReadingActivityByDay([])).toEqual({});
  });

  it("returns empty object when no books have date_finished", () => {
    const books = [
      makeBook({ status: "finished", date_finished: null }),
      makeBook({ status: "reading", date_finished: null }),
    ];
    expect(getReadingActivityByDay(books)).toEqual({});
  });

  it("counts only books with status === 'finished' and non-null date_finished", () => {
    const books = [
      makeBook({ status: "reading", date_finished: "2026-03-15" }),
      makeBook({ status: "want_to_read", date_finished: "2026-03-15" }),
      makeBook({ status: "finished", date_finished: "2026-03-15" }),
    ];
    const result = getReadingActivityByDay(books);
    expect(result["2026-03-15"]).toBe(1);
    expect(Object.keys(result)).toHaveLength(1);
  });

  it("only includes dates within the last 52 weeks", () => {
    // FIXED_NOW = 2026-03-31. 52 weeks back = 2025-04-01 (approx).
    const books = [
      makeBook({ status: "finished", date_finished: "2024-01-01" }), // >52 weeks ago
      makeBook({ status: "finished", date_finished: "2026-03-15" }), // within window
    ];
    const result = getReadingActivityByDay(books);
    expect(result["2024-01-01"]).toBeUndefined();
    expect(result["2026-03-15"]).toBe(1);
  });

  it("multiple books on the same day increment the count", () => {
    const books = [
      makeBook({ status: "finished", date_finished: "2026-03-20" }),
      makeBook({ status: "finished", date_finished: "2026-03-20" }),
      makeBook({ status: "finished", date_finished: "2026-03-20" }),
    ];
    const result = getReadingActivityByDay(books);
    expect(result["2026-03-20"]).toBe(3);
  });

  it("includes a book finished exactly 52 weeks ago", () => {
    // FIXED_NOW = 2026-03-31. Exactly 52 weeks back = 2025-04-01.
    const books = [
      makeBook({ status: "finished", date_finished: "2025-04-01" }),
    ];
    const result = getReadingActivityByDay(books);
    expect(result["2025-04-01"]).toBe(1);
  });

  it("excludes a book finished 53 weeks ago", () => {
    // 53 weeks before 2026-03-31 = 2025-03-25
    const books = [
      makeBook({ status: "finished", date_finished: "2025-03-25" }),
    ];
    const result = getReadingActivityByDay(books);
    expect(result["2025-03-25"]).toBeUndefined();
  });

  it("returns correct YYYY-MM-DD keys", () => {
    const books = [
      makeBook({ status: "finished", date_finished: "2026-01-05" }),
    ];
    const result = getReadingActivityByDay(books);
    expect(Object.keys(result)).toContain("2026-01-05");
  });
});
