import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchBooks, getBookDetails } from "@/lib/openlibrary";

// ---------------------------------------------------------------------------
// Mock global fetch — openlibrary.ts calls fetch() directly.
// ---------------------------------------------------------------------------
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeDoc(overrides: Record<string, unknown> = {}) {
  return {
    key: "/works/OL12345W",
    title: "Test Book",
    author_name: ["Test Author"],
    cover_i: 12345,
    subject: ["Fiction", "Adventure"],
    first_publish_year: 2000,
    ...overrides,
  };
}

function makeFetchResponse(body: unknown, ok = true) {
  return {
    ok,
    status: ok ? 200 : 500,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(String(body)),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ===========================================================================
// searchBooks
// ===========================================================================

describe("searchBooks — successful response", () => {
  it("returns an array of BookSearchResult objects", async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ docs: [makeDoc()] })
    );

    const results = await searchBooks("test book");
    expect(Array.isArray(results)).toBe(true);
    expect(results).toHaveLength(1);
  });

  it("maps ol_key correctly from doc.key", async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ docs: [makeDoc({ key: "/works/OL99W" })] })
    );

    const results = await searchBooks("test");
    expect(results[0].ol_key).toBe("/works/OL99W");
  });

  it("maps title correctly", async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ docs: [makeDoc({ title: "Moby Dick" })] })
    );

    const results = await searchBooks("moby");
    expect(results[0].title).toBe("Moby Dick");
  });

  it("maps author from the first element of author_name array", async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({
        docs: [makeDoc({ author_name: ["Herman Melville", "Other Author"] })],
      })
    );

    const results = await searchBooks("moby");
    expect(results[0].author).toBe("Herman Melville");
  });

  it("falls back to 'Unknown Author' when author_name is missing", async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ docs: [makeDoc({ author_name: undefined })] })
    );

    const results = await searchBooks("test");
    expect(results[0].author).toBe("Unknown Author");
  });

  it("falls back to 'Unknown Author' when author_name is empty array", async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ docs: [makeDoc({ author_name: [] })] })
    );

    const results = await searchBooks("test");
    expect(results[0].author).toBe("Unknown Author");
  });

  it("builds cover_url from cover_i when present", async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ docs: [makeDoc({ cover_i: 98765 })] })
    );

    const results = await searchBooks("test");
    expect(results[0].cover_url).toBe(
      "https://covers.openlibrary.org/b/id/98765-M.jpg"
    );
  });

  it("sets cover_url to null when cover_i is absent", async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ docs: [makeDoc({ cover_i: undefined })] })
    );

    const results = await searchBooks("test");
    expect(results[0].cover_url).toBeNull();
  });

  it("uses the first subject as genre", async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({
        docs: [makeDoc({ subject: ["Science Fiction", "Space Opera"] })],
      })
    );

    const results = await searchBooks("test");
    expect(results[0].genre).toBe("Science Fiction");
  });

  it("sets genre to null when subject array is empty", async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ docs: [makeDoc({ subject: [] })] })
    );

    const results = await searchBooks("test");
    expect(results[0].genre).toBeNull();
  });

  it("sets genre to null when subject is absent", async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ docs: [makeDoc({ subject: undefined })] })
    );

    const results = await searchBooks("test");
    expect(results[0].genre).toBeNull();
  });

  it("maps first_publish_year correctly", async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ docs: [makeDoc({ first_publish_year: 1851 })] })
    );

    const results = await searchBooks("test");
    expect(results[0].first_publish_year).toBe(1851);
  });

  it("sets first_publish_year to null when absent", async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ docs: [makeDoc({ first_publish_year: undefined })] })
    );

    const results = await searchBooks("test");
    expect(results[0].first_publish_year).toBeNull();
  });

  it("always returns synopsis as null (not populated by search)", async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ docs: [makeDoc()] })
    );

    const results = await searchBooks("test");
    expect(results[0].synopsis).toBeNull();
  });

  it("returns an empty array when docs is empty", async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ docs: [] }));

    const results = await searchBooks("nothing");
    expect(results).toEqual([]);
  });

  it("returns an empty array when docs is absent from response", async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({}));

    const results = await searchBooks("nothing");
    expect(results).toEqual([]);
  });

  it("returns multiple results when docs has multiple entries", async () => {
    const docs = [
      makeDoc({ key: "/works/OL1W", title: "Book A" }),
      makeDoc({ key: "/works/OL2W", title: "Book B" }),
      makeDoc({ key: "/works/OL3W", title: "Book C" }),
    ];
    mockFetch.mockResolvedValue(makeFetchResponse({ docs }));

    const results = await searchBooks("test");
    expect(results).toHaveLength(3);
    expect(results.map((r) => r.title)).toEqual(["Book A", "Book B", "Book C"]);
  });

  it("encodes the query string in the URL", async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ docs: [] }));

    await searchBooks("harry potter");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("harry%20potter");
  });

  it("calls the Open Library search endpoint", async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ docs: [] }));

    await searchBooks("test");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("openlibrary.org/search.json");
  });

  it("limits results to 10 in the request URL", async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ docs: [] }));

    await searchBooks("test");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("limit=10");
  });
});

describe("searchBooks — edge cases", () => {
  it("handles a Unicode query without throwing", async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ docs: [] }));
    await expect(searchBooks("L'Étranger")).resolves.toEqual([]);
  });

  it("handles an empty string query without throwing", async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({ docs: [] }));
    await expect(searchBooks("")).resolves.toEqual([]);
  });

  it("propagates fetch rejection", async () => {
    mockFetch.mockRejectedValue(new Error("Network failure"));
    await expect(searchBooks("test")).rejects.toThrow("Network failure");
  });
});

// ===========================================================================
// getBookDetails
// ===========================================================================

describe("getBookDetails — synopsis extraction", () => {
  it("returns synopsis when description is a plain string", async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ description: "A compelling tale." })
    );

    const result = await getBookDetails("/works/OL12345W");
    expect(result.synopsis).toBe("A compelling tale.");
  });

  it("returns synopsis from description.value when description is an object", async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({
        description: { type: "/type/text", value: "An object description." },
      })
    );

    const result = await getBookDetails("/works/OL12345W");
    expect(result.synopsis).toBe("An object description.");
  });

  it("returns null when description is absent", async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({}));

    const result = await getBookDetails("/works/OL12345W");
    expect(result.synopsis).toBeNull();
  });

  it("returns null when description.value is absent in object form", async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ description: { type: "/type/text" } })
    );

    const result = await getBookDetails("/works/OL12345W");
    expect(result.synopsis).toBeNull();
  });

  it("calls the Open Library works endpoint with the provided key", async () => {
    mockFetch.mockResolvedValue(makeFetchResponse({}));

    await getBookDetails("/works/OL99W");

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/works/OL99W.json");
    expect(calledUrl).toContain("openlibrary.org");
  });

  it("returns a partial BookSearchResult (only synopsis key)", async () => {
    mockFetch.mockResolvedValue(
      makeFetchResponse({ description: "A short synopsis." })
    );

    const result = await getBookDetails("/works/OL12345W");
    expect(result).toEqual({ synopsis: "A short synopsis." });
  });

  it("propagates fetch rejection", async () => {
    mockFetch.mockRejectedValue(new Error("Network failure"));
    await expect(getBookDetails("/works/OL1W")).rejects.toThrow("Network failure");
  });
});
