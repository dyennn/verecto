import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useQuotes } from "@/hooks/useQuotes";
import type { QuoteRow } from "@/hooks/useQuotes";

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockOrder = vi.fn();
const mockEq = vi.fn();
const mockInsert = vi.fn();
const mockDelete = vi.fn();
const mockGetUser = vi.fn();

// Build a chainable query mock
function makeQueryChain(resolveValue: unknown) {
  const chain: Record<string, unknown> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.order = vi.fn(() => chain);
  chain.insert = vi.fn(() => chain);
  chain.delete = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(resolveValue));
  // make the chain itself thenable so await works on it
  (chain as Promise<unknown> & Record<string, unknown>).then = (onFulfilled: (v: unknown) => unknown) =>
    Promise.resolve(resolveValue).then(onFulfilled);
  return chain;
}

const mockSupabase = {
  auth: {
    getUser: mockGetUser,
  },
  from: vi.fn(),
};

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeQuote(overrides: Partial<QuoteRow> = {}): QuoteRow {
  return {
    id: "quote-1",
    user_id: "user-1",
    book_id: "book-1",
    text: "A great quote.",
    page_number: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function setupFromMock(data: unknown, error: unknown = null) {
  mockSupabase.from.mockImplementation(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data, error })),
        })),
        order: vi.fn(() => Promise.resolve({ data, error })),
      })),
      order: vi.fn(() => Promise.resolve({ data, error })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: data, error })),
      })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data: null, error })),
    })),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  setupFromMock([]);
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
describe("useQuotes — initial state", () => {
  it("starts with an empty quotes array", () => {
    const { result } = renderHook(() => useQuotes("book-1"));
    expect(result.current.quotes).toEqual([]);
  });

  it("starts with loading = false", () => {
    const { result } = renderHook(() => useQuotes("book-1"));
    expect(result.current.loading).toBe(false);
  });

  it("exposes fetchQuotes, addQuote, deleteQuote functions", () => {
    const { result } = renderHook(() => useQuotes("book-1"));
    expect(typeof result.current.fetchQuotes).toBe("function");
    expect(typeof result.current.addQuote).toBe("function");
    expect(typeof result.current.deleteQuote).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// fetchQuotes
// ---------------------------------------------------------------------------
describe("useQuotes — fetchQuotes", () => {
  it("sets quotes from the fetched data", async () => {
    const quotes = [
      makeQuote({ id: "q-1", text: "Quote one." }),
      makeQuote({ id: "q-2", text: "Quote two." }),
    ];
    setupFromMock(quotes);

    const { result } = renderHook(() => useQuotes("book-1"));

    await act(async () => {
      await result.current.fetchQuotes();
    });

    expect(result.current.quotes).toEqual(quotes);
  });

  it("sets loading to false after fetchQuotes resolves", async () => {
    setupFromMock([makeQuote()]);

    const { result } = renderHook(() => useQuotes("book-1"));

    await act(async () => {
      await result.current.fetchQuotes();
    });

    expect(result.current.loading).toBe(false);
  });

  it("sets quotes to [] when data is null", async () => {
    setupFromMock(null);

    const { result } = renderHook(() => useQuotes("book-1"));

    await act(async () => {
      await result.current.fetchQuotes();
    });

    expect(result.current.quotes).toEqual([]);
  });

  it("sets loading to false on fetch error", async () => {
    setupFromMock(null, { message: "network error" });

    const { result } = renderHook(() => useQuotes("book-1"));

    await act(async () => {
      await result.current.fetchQuotes();
    });

    expect(result.current.loading).toBe(false);
  });

  it("leaves quotes unchanged on fetch error", async () => {
    setupFromMock(null, { message: "db error" });

    const { result } = renderHook(() => useQuotes("book-1"));

    await act(async () => {
      await result.current.fetchQuotes();
    });

    expect(result.current.quotes).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// addQuote
// ---------------------------------------------------------------------------
describe("useQuotes — addQuote", () => {
  it("returns { error: 'Not authenticated' } when no user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useQuotes("book-1"));

    let response: Awaited<ReturnType<typeof result.current.addQuote>>;
    await act(async () => {
      response = await result.current.addQuote("Some text");
    });

    expect(response!).toEqual({ error: "Not authenticated" });
  });

  it("prepends the new quote to the quotes array on success", async () => {
    const existing = makeQuote({ id: "q-old", text: "Old quote." });
    const newQuote = makeQuote({ id: "q-new", text: "New quote." });

    // Set initial quotes
    setupFromMock([existing]);
    const { result } = renderHook(() => useQuotes("book-1"));

    await act(async () => {
      await result.current.fetchQuotes();
    });

    // Now set up addQuote response
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [existing], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: newQuote, error: null })),
        })),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
      })),
    }));

    await act(async () => {
      await result.current.addQuote("New quote.");
    });

    expect(result.current.quotes[0]).toEqual(newQuote);
    expect(result.current.quotes[1]).toEqual(existing);
  });

  it("returns { error } when insert fails", async () => {
    mockSupabase.from.mockImplementation(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({ data: null, error: { message: "insert failed" } })
          ),
        })),
      })),
    }));

    const { result } = renderHook(() => useQuotes("book-1"));

    let response: Awaited<ReturnType<typeof result.current.addQuote>>;
    await act(async () => {
      response = await result.current.addQuote("Some text");
    });

    expect(response!).toEqual({ error: "insert failed" });
  });

  it("trims whitespace from the text before inserting", async () => {
    const newQuote = makeQuote({ text: "trimmed" });

    const insertMock = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ data: newQuote, error: null })),
      })),
    }));

    mockSupabase.from.mockImplementation(() => ({
      insert: insertMock,
    }));

    const { result } = renderHook(() => useQuotes("book-1"));

    await act(async () => {
      await result.current.addQuote("  trimmed  ");
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({ text: "trimmed" })
    );
  });
});

// ---------------------------------------------------------------------------
// deleteQuote
// ---------------------------------------------------------------------------
describe("useQuotes — deleteQuote", () => {
  it("removes the quote from the list on success", async () => {
    const q1 = makeQuote({ id: "q-1" });
    const q2 = makeQuote({ id: "q-2" });

    setupFromMock([q1, q2]);

    const { result } = renderHook(() => useQuotes("book-1"));

    await act(async () => {
      await result.current.fetchQuotes();
    });

    mockSupabase.from.mockImplementation(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    }));

    await act(async () => {
      await result.current.deleteQuote("q-1");
    });

    expect(result.current.quotes).toEqual([q2]);
  });

  it("returns {} on successful deletion", async () => {
    mockSupabase.from.mockImplementation(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ error: null })),
      })),
    }));

    const { result } = renderHook(() => useQuotes("book-1"));

    let response: Awaited<ReturnType<typeof result.current.deleteQuote>>;
    await act(async () => {
      response = await result.current.deleteQuote("q-1");
    });

    expect(response!).toEqual({});
  });

  it("returns { error } when deletion fails", async () => {
    mockSupabase.from.mockImplementation(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() =>
          Promise.resolve({ error: { message: "delete failed" } })
        ),
      })),
    }));

    const { result } = renderHook(() => useQuotes("book-1"));

    let response: Awaited<ReturnType<typeof result.current.deleteQuote>>;
    await act(async () => {
      response = await result.current.deleteQuote("q-1");
    });

    expect(response!).toEqual({ error: "delete failed" });
  });

  it("does not mutate the quotes list on deletion failure", async () => {
    const q1 = makeQuote({ id: "q-1" });
    setupFromMock([q1]);

    const { result } = renderHook(() => useQuotes("book-1"));

    await act(async () => {
      await result.current.fetchQuotes();
    });

    mockSupabase.from.mockImplementation(() => ({
      delete: vi.fn(() => ({
        eq: vi.fn(() =>
          Promise.resolve({ error: { message: "delete failed" } })
        ),
      })),
    }));

    await act(async () => {
      await result.current.deleteQuote("q-1");
    });

    // Quotes unchanged because deletion failed
    expect(result.current.quotes).toEqual([q1]);
  });
});
