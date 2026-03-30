// Goodreads CSV parser and field mapper

/**
 * Normalizes a title+author pair into a stable key for duplicate detection.
 * Handles diacritics, subtitles, punctuation, and whitespace differences.
 */
export function normalizeForMatch(title: string, author: string): string {
  function norm(s: string): string {
    return s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // strip diacritics
      .toLowerCase()
      .replace(/[:]\s*.*/g, "")        // strip subtitle after colon
      .replace(/\s-\s.*/g, "")         // strip subtitle after " - "
      .replace(/['".,!?()]/g, "")      // remove punctuation
      .replace(/\s+/g, " ")            // collapse whitespace
      .trim();
  }
  return `${norm(title)}|||${norm(author)}`;
}

export interface GoodreadsBook {
  title: string;
  author: string;
  isbn: string | null;
  isbn13: string | null;
  rating: number; // 0–5
  shelf: string; // "read" | "currently-reading" | "to-read"
  dateRead: string | null; // YYYY-MM-DD or null
  bookshelves: string[];
  goodreadsId: string;
}

export interface MappedBook {
  title: string;
  author: string | undefined;
  genre: string | undefined;
  status: "want_to_read" | "reading" | "finished";
  mood: "loved_it" | "it_was_fine" | "dnf" | null;
  date_finished: string | null;
  isbn13: string | null;
}

/**
 * Splits a single CSV line into fields, respecting quoted fields.
 * Handles: commas inside quotes, escaped quotes (""), newlines inside quotes.
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        // Peek ahead — doubled quote is an escaped quote
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Strips Excel-protection wrapper: ="value" or =value → value
 */
function stripExcelWrapper(value: string): string {
  return value.replace(/^="?(.*?)"?$/, "$1").trim();
}

/**
 * Converts Goodreads date format YYYY/MM/DD to YYYY-MM-DD.
 * Returns null for empty or invalid dates.
 */
function normalizeDate(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  // Replace slashes with dashes
  const normalized = trimmed.replace(/\//g, "-");
  // Basic validity check: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) return normalized;
  return null;
}

/**
 * Parses a Goodreads library export CSV string into structured objects.
 */
export function parseGoodreadsCsv(text: string): GoodreadsBook[] {
  // Normalize line endings, then split — but we need to handle
  // quoted newlines (multi-line fields like reviews).
  // Strategy: split into rows by walking character by character.
  const rows: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"') {
        if (next === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
          current += ch;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
        current += ch;
      } else if (ch === "\n") {
        rows.push(current);
        current = "";
      } else if (ch === "\r" && next === "\n") {
        rows.push(current);
        current = "";
        i++; // skip \n
      } else if (ch === "\r") {
        rows.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  if (current.trim()) rows.push(current);

  if (rows.length < 2) return [];

  // Build column index map from header row
  const headers = splitCsvLine(rows[0]).map((h) => h.trim());
  const col = (name: string): number => headers.indexOf(name);

  const titleIdx = col("Title");
  const authorIdx = col("Author");
  const isbnIdx = col("ISBN");
  const isbn13Idx = col("ISBN13");
  const ratingIdx = col("My Rating");
  const shelfIdx = col("Exclusive Shelf");
  const dateReadIdx = col("Date Read");
  const bookshelvesIdx = col("Bookshelves");
  const bookIdIdx = col("Book Id");

  if (titleIdx === -1) return []; // not a valid Goodreads export

  const books: GoodreadsBook[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i].trim();
    if (!row) continue;

    const fields = splitCsvLine(row);
    const get = (idx: number) => (idx >= 0 ? (fields[idx] ?? "").trim() : "");

    const title = get(titleIdx);
    if (!title) continue; // skip rows without a title

    const bookshelves = bookshelvesIdx >= 0
      ? get(bookshelvesIdx)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : [];

    books.push({
      title,
      author: get(authorIdx),
      isbn: stripExcelWrapper(get(isbnIdx)) || null,
      isbn13: stripExcelWrapper(get(isbn13Idx)) || null,
      rating: parseInt(get(ratingIdx)) || 0,
      shelf: get(shelfIdx) || "to-read",
      dateRead: normalizeDate(get(dateReadIdx)),
      bookshelves,
      goodreadsId: get(bookIdIdx),
    });
  }

  return books;
}

/**
 * Maps parsed Goodreads books to Verecto's BookRow-compatible shape.
 */
export function mapGoodreadsToVerecto(books: GoodreadsBook[]): MappedBook[] {
  return books.map((book) => {
    // Status mapping
    let status: MappedBook["status"] = "want_to_read";
    if (book.shelf === "read") status = "finished";
    else if (book.shelf === "currently-reading") status = "reading";

    // Mood mapping (only meaningful for finished books)
    let mood: MappedBook["mood"] = null;
    if (status === "finished" && book.rating > 0) {
      if (book.rating >= 4) mood = "loved_it";
      else if (book.rating === 3) mood = "it_was_fine";
      else mood = "dnf";
    }

    // Genre from first custom bookshelf (exclude standard shelves)
    const standardShelves = new Set(["read", "currently-reading", "to-read"]);
    const customShelf = book.bookshelves.find((s) => !standardShelves.has(s));

    return {
      title: book.title,
      author: book.author || undefined,
      genre: customShelf,
      status,
      mood,
      date_finished: status === "finished" ? book.dateRead : null,
      isbn13: book.isbn13,
    };
  });
}
