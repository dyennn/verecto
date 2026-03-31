import { describe, it, expect } from "vitest";
import {
  normalizeForMatch,
  parseGoodreadsCsv,
  mapGoodreadsToVerecto,
} from "@/lib/csv-parse";
import type { GoodreadsBook } from "@/lib/csv-parse";

// ---------------------------------------------------------------------------
// normalizeForMatch
// ---------------------------------------------------------------------------
describe("normalizeForMatch", () => {
  it("returns a string with ||| separator", () => {
    const result = normalizeForMatch("Dune", "Frank Herbert");
    expect(result).toContain("|||");
  });

  it("lowercases title and author", () => {
    expect(normalizeForMatch("DUNE", "FRANK HERBERT")).toBe(
      normalizeForMatch("dune", "frank herbert")
    );
  });

  it("strips diacritics", () => {
    // é → e, ñ → n, etc.
    expect(normalizeForMatch("L'Étranger", "Camus")).toBe(
      normalizeForMatch("L'Etranger", "Camus")
    );
  });

  it("strips subtitle after a colon", () => {
    const withSub = normalizeForMatch("Dune: Messiah", "Herbert");
    const withoutSub = normalizeForMatch("Dune", "Herbert");
    expect(withSub).toBe(withoutSub);
  });

  it("strips subtitle after ' - '", () => {
    const withSub = normalizeForMatch("Dune - Messiah", "Herbert");
    const withoutSub = normalizeForMatch("Dune", "Herbert");
    expect(withSub).toBe(withoutSub);
  });

  it("removes punctuation characters (apostrophe, comma, period, exclamation)", () => {
    expect(normalizeForMatch("It's Fine!", "O'Brien")).toBe(
      normalizeForMatch("Its Fine", "OBrien")
    );
  });

  it("collapses multiple spaces into one", () => {
    expect(normalizeForMatch("Hello  World", "A  B")).toBe(
      normalizeForMatch("Hello World", "A B")
    );
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeForMatch("  Dune  ", "  Herbert  ")).toBe(
      normalizeForMatch("Dune", "Herbert")
    );
  });

  it("produces identical keys for semantically duplicate titles", () => {
    const a = normalizeForMatch("The Great Gatsby: A Novel", "F. Scott Fitzgerald");
    const b = normalizeForMatch("The Great Gatsby", "F Scott Fitzgerald");
    expect(a).toBe(b);
  });

  it("produces different keys for different title+author pairs", () => {
    const a = normalizeForMatch("Dune", "Frank Herbert");
    const b = normalizeForMatch("Foundation", "Isaac Asimov");
    expect(a).not.toBe(b);
  });

  it("handles empty strings without throwing", () => {
    expect(() => normalizeForMatch("", "")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// parseGoodreadsCsv — helpers
// ---------------------------------------------------------------------------

const STANDARD_HEADER =
  "Book Id,Title,Author,Author l-f,Additional Authors,ISBN,ISBN13,My Rating,Average Rating,Publisher,Binding,Number of Pages,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Bookshelves with positions,Exclusive Shelf,My Review,Spoiler,Private Notes,Read Count,Owned Copies";

function makeCsvRow(overrides: Record<string, string> = {}): string {
  const defaults: Record<string, string> = {
    "Book Id": "12345",
    Title: "Test Title",
    Author: "Test Author",
    "Author l-f": "Author, Test",
    "Additional Authors": "",
    ISBN: '="9780000000001"',
    ISBN13: '="9780000000002"',
    "My Rating": "0",
    "Average Rating": "4.00",
    Publisher: "Publisher",
    Binding: "Paperback",
    "Number of Pages": "300",
    "Year Published": "2020",
    "Original Publication Year": "2020",
    "Date Read": "",
    "Date Added": "2026-01-01",
    Bookshelves: "",
    "Bookshelves with positions": "",
    "Exclusive Shelf": "to-read",
    "My Review": "",
    Spoiler: "",
    "Private Notes": "",
    "Read Count": "0",
    "Owned Copies": "0",
    ...overrides,
  };

  // Build the row in header order
  const headerCols = STANDARD_HEADER.split(",").map((h) => h.trim());
  return headerCols
    .map((h) => {
      const val = defaults[h] ?? "";
      // Quote if contains a comma or double-quote; escape inner quotes by doubling
      if (val.includes(",") || val.includes('"')) {
        return `"${val.replace(/"/g, '""')}"`;
      }
      return val;
    })
    .join(",");
}

function makeCsv(...rows: string[]): string {
  return [STANDARD_HEADER, ...rows].join("\n");
}

// ---------------------------------------------------------------------------
// parseGoodreadsCsv — empty / invalid input
// ---------------------------------------------------------------------------
describe("parseGoodreadsCsv — empty / invalid input", () => {
  it("returns [] for an empty string", () => {
    expect(parseGoodreadsCsv("")).toEqual([]);
  });

  it("returns [] for a header-only CSV", () => {
    expect(parseGoodreadsCsv(STANDARD_HEADER)).toEqual([]);
  });

  it("returns [] when the Title column is missing", () => {
    const badHeader = "Author,Rating\nHerbert,5";
    expect(parseGoodreadsCsv(badHeader)).toEqual([]);
  });

  it("skips blank data rows", () => {
    const csv = makeCsv("", "   ");
    expect(parseGoodreadsCsv(csv)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// parseGoodreadsCsv — single row
// ---------------------------------------------------------------------------
describe("parseGoodreadsCsv — single row", () => {
  it("parses title and author correctly", () => {
    const csv = makeCsv(makeCsvRow({ Title: "Dune", Author: "Frank Herbert" }));
    const [book] = parseGoodreadsCsv(csv);
    expect(book.title).toBe("Dune");
    expect(book.author).toBe("Frank Herbert");
  });

  it("maps goodreadsId from Book Id column", () => {
    const csv = makeCsv(makeCsvRow({ "Book Id": "99999" }));
    const [book] = parseGoodreadsCsv(csv);
    expect(book.goodreadsId).toBe("99999");
  });

  it("maps rating as a number", () => {
    const csv = makeCsv(makeCsvRow({ "My Rating": "5" }));
    const [book] = parseGoodreadsCsv(csv);
    expect(book.rating).toBe(5);
  });

  it("defaults rating to 0 for an empty rating", () => {
    const csv = makeCsv(makeCsvRow({ "My Rating": "" }));
    const [book] = parseGoodreadsCsv(csv);
    expect(book.rating).toBe(0);
  });

  it("maps shelf from Exclusive Shelf column", () => {
    const csv = makeCsv(makeCsvRow({ "Exclusive Shelf": "read" }));
    const [book] = parseGoodreadsCsv(csv);
    expect(book.shelf).toBe("read");
  });

  it("defaults shelf to 'to-read' when Exclusive Shelf is empty", () => {
    const csv = makeCsv(makeCsvRow({ "Exclusive Shelf": "" }));
    const [book] = parseGoodreadsCsv(csv);
    expect(book.shelf).toBe("to-read");
  });

  it("strips Excel =\" wrapper from ISBN13", () => {
    const csv = makeCsv(makeCsvRow({ ISBN13: '="9780143127741"' }));
    const [book] = parseGoodreadsCsv(csv);
    expect(book.isbn13).toBe("9780143127741");
  });

  it("normalizes date from YYYY/MM/DD to YYYY-MM-DD", () => {
    const csv = makeCsv(makeCsvRow({ "Date Read": "2026/03/15" }));
    const [book] = parseGoodreadsCsv(csv);
    expect(book.dateRead).toBe("2026-03-15");
  });

  it("returns null dateRead for an empty date", () => {
    const csv = makeCsv(makeCsvRow({ "Date Read": "" }));
    const [book] = parseGoodreadsCsv(csv);
    expect(book.dateRead).toBeNull();
  });

  it("returns null for invalid date formats", () => {
    const csv = makeCsv(makeCsvRow({ "Date Read": "not-a-date" }));
    const [book] = parseGoodreadsCsv(csv);
    expect(book.dateRead).toBeNull();
  });

  it("splits bookshelves by comma", () => {
    const csv = makeCsv(
      makeCsvRow({ Bookshelves: "fantasy,favorites,must-read" })
    );
    const [book] = parseGoodreadsCsv(csv);
    expect(book.bookshelves).toEqual(["fantasy", "favorites", "must-read"]);
  });

  it("returns empty bookshelves array when Bookshelves is empty", () => {
    const csv = makeCsv(makeCsvRow({ Bookshelves: "" }));
    const [book] = parseGoodreadsCsv(csv);
    expect(book.bookshelves).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// parseGoodreadsCsv — multiple rows
// ---------------------------------------------------------------------------
describe("parseGoodreadsCsv — multiple rows", () => {
  it("parses two data rows into two objects", () => {
    const csv = makeCsv(
      makeCsvRow({ Title: "Book A" }),
      makeCsvRow({ Title: "Book B" })
    );
    expect(parseGoodreadsCsv(csv)).toHaveLength(2);
  });

  it("handles CRLF line endings", () => {
    const csv = [
      STANDARD_HEADER,
      makeCsvRow({ Title: "CRLF Book" }),
    ].join("\r\n");
    const books = parseGoodreadsCsv(csv);
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe("CRLF Book");
  });

  it("handles CR-only line endings", () => {
    const csv = [
      STANDARD_HEADER,
      makeCsvRow({ Title: "CR Book" }),
    ].join("\r");
    const books = parseGoodreadsCsv(csv);
    expect(books).toHaveLength(1);
    expect(books[0].title).toBe("CR Book");
  });
});

// ---------------------------------------------------------------------------
// parseGoodreadsCsv — special CSV characters
// ---------------------------------------------------------------------------
describe("parseGoodreadsCsv — CSV edge cases", () => {
  it("handles a title with a comma inside double-quotes", () => {
    // Build a custom row where Title is quoted and contains a comma
    const row =
      `12345,"Hello, World",Author,,,"","",0,4.00,Publisher,Paperback,300,2020,2020,,2026-01-01,,,,to-read,,,, 0,0`;
    const header = STANDARD_HEADER;
    const csv = header + "\n" + row;
    const books = parseGoodreadsCsv(csv);
    expect(books[0]?.title).toBe("Hello, World");
  });

  it("handles an escaped double-quote inside a quoted field using makeCsvRow", () => {
    // Construct a properly column-aligned row using makeCsvRow so column
    // indices match the STANDARD_HEADER exactly.
    // The makeGoodreadsCSV helper quotes the title when it contains '"', but
    // the CSV parser correctly decodes doubled quotes ("") to a single ".
    const csv = makeCsv(makeCsvRow({ Title: 'He said "Hello"' }));
    const books = parseGoodreadsCsv(csv);
    expect(books[0]?.title).toBe('He said "Hello"');
  });
});

// ---------------------------------------------------------------------------
// mapGoodreadsToVerecto
// ---------------------------------------------------------------------------
describe("mapGoodreadsToVerecto", () => {
  it("returns an empty array for an empty input", () => {
    expect(mapGoodreadsToVerecto([])).toEqual([]);
  });

  function makeGRBook(overrides: Partial<GoodreadsBook> = {}): GoodreadsBook {
    return {
      title: "Test",
      author: "Author",
      isbn: null,
      isbn13: null,
      rating: 0,
      shelf: "to-read",
      dateRead: null,
      bookshelves: [],
      goodreadsId: "1",
      ...overrides,
    };
  }

  it("maps shelf='to-read' → status='want_to_read'", () => {
    const [book] = mapGoodreadsToVerecto([makeGRBook({ shelf: "to-read" })]);
    expect(book.status).toBe("want_to_read");
  });

  it("maps shelf='currently-reading' → status='reading'", () => {
    const [book] = mapGoodreadsToVerecto([
      makeGRBook({ shelf: "currently-reading" }),
    ]);
    expect(book.status).toBe("reading");
  });

  it("maps shelf='read' → status='finished'", () => {
    const [book] = mapGoodreadsToVerecto([makeGRBook({ shelf: "read" })]);
    expect(book.status).toBe("finished");
  });

  it("sets mood='loved_it' when rating >= 4 and finished", () => {
    const [book] = mapGoodreadsToVerecto([
      makeGRBook({ shelf: "read", rating: 5 }),
    ]);
    expect(book.mood).toBe("loved_it");
  });

  it("sets mood='loved_it' for rating=4", () => {
    const [book] = mapGoodreadsToVerecto([
      makeGRBook({ shelf: "read", rating: 4 }),
    ]);
    expect(book.mood).toBe("loved_it");
  });

  it("sets mood='it_was_fine' when rating=3 and finished", () => {
    const [book] = mapGoodreadsToVerecto([
      makeGRBook({ shelf: "read", rating: 3 }),
    ]);
    expect(book.mood).toBe("it_was_fine");
  });

  it("sets mood='dnf' when rating=1 and finished", () => {
    const [book] = mapGoodreadsToVerecto([
      makeGRBook({ shelf: "read", rating: 1 }),
    ]);
    expect(book.mood).toBe("dnf");
  });

  it("sets mood=null when rating=0 (unrated)", () => {
    const [book] = mapGoodreadsToVerecto([
      makeGRBook({ shelf: "read", rating: 0 }),
    ]);
    expect(book.mood).toBeNull();
  });

  it("sets mood=null for non-finished books regardless of rating", () => {
    const [book] = mapGoodreadsToVerecto([
      makeGRBook({ shelf: "to-read", rating: 5 }),
    ]);
    expect(book.mood).toBeNull();
  });

  it("uses the first non-standard bookshelf as genre", () => {
    const [book] = mapGoodreadsToVerecto([
      makeGRBook({ bookshelves: ["read", "fantasy", "favorites"] }),
    ]);
    expect(book.genre).toBe("fantasy");
  });

  it("sets genre to undefined when all bookshelves are standard", () => {
    const [book] = mapGoodreadsToVerecto([
      makeGRBook({ bookshelves: ["read", "to-read"] }),
    ]);
    expect(book.genre).toBeUndefined();
  });

  it("sets date_finished from dateRead when status is finished", () => {
    const [book] = mapGoodreadsToVerecto([
      makeGRBook({ shelf: "read", dateRead: "2026-03-15" }),
    ]);
    expect(book.date_finished).toBe("2026-03-15");
  });

  it("sets date_finished to null for non-finished books", () => {
    const [book] = mapGoodreadsToVerecto([
      makeGRBook({ shelf: "to-read", dateRead: "2026-03-15" }),
    ]);
    expect(book.date_finished).toBeNull();
  });

  it("sets author to undefined when author is empty string", () => {
    const [book] = mapGoodreadsToVerecto([makeGRBook({ author: "" })]);
    expect(book.author).toBeUndefined();
  });

  it("passes isbn13 through", () => {
    const [book] = mapGoodreadsToVerecto([
      makeGRBook({ isbn13: "9780143127741" }),
    ]);
    expect(book.isbn13).toBe("9780143127741");
  });
});
