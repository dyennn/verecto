import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useBooks } from "@/hooks/useBooks";
import type { BookRow } from "@/hooks/useBooks";
import type { MappedBook } from "@/lib/csv-parse";

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------
const mockGetUser = vi.fn();
const mockSingle = vi.fn();
const mockOrderChain = vi.fn();
const mockInsert = vi.fn();

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: vi.fn(),
};

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeBook(overrides: Partial<BookRow> = {}): BookRow {
  return {
    id: "book-1",
    user_id: "user-1",
    ol_key: null,
    title: "Test Book",
    author: "Test Author",
    genre: null,
    cover_url: null,
    synopsis: null,
    status: "want_to_read",
    mood: null,
    progress: null,
    date_finished: null,
    current_chapter: null,
    total_chapters: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function makeMapped(overrides: Partial<MappedBook> = {}): MappedBook {
  return {
    title: "Mapped Book",
    author: "Mapped Author",
    genre: "Fantasy",
    status: "finished",
    mood: "loved_it",
    date_finished: "2026-01-15",
    isbn13: null,
    ...overrides,
  };
}

function setupFetchBooksChain(
  data: BookRow[] | null,
  error: unknown = null
) {
  mockSupabase.from.mockImplementation(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => Promise.resolve({ data, error })),
      })),
    })),
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: mockSingle,
      })),
    })),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    })),
  }));
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  setupFetchBooksChain([]);
  mockSingle.mockResolvedValue({ data: null, error: null });
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
describe("useBooks — initial state", () => {
  it("starts with an empty books array", () => {
    const { result } = renderHook(() => useBooks());
    expect(result.current.books).toEqual([]);
  });

  it("starts with loading = true", () => {
    const { result } = renderHook(() => useBooks());
    expect(result.current.loading).toBe(true);
  });

  it("exposes fetchBooks, addBook, updateBook, importBooks", () => {
    const { result } = renderHook(() => useBooks());
    expect(typeof result.current.fetchBooks).toBe("function");
    expect(typeof result.current.addBook).toBe("function");
    expect(typeof result.current.updateBook).toBe("function");
    expect(typeof result.current.importBooks).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// fetchBooks
// ---------------------------------------------------------------------------
describe("useBooks — fetchBooks", () => {
  it("sets books from fetched data", async () => {
    const books = [makeBook({ id: "b-1" }), makeBook({ id: "b-2" })];
    setupFetchBooksChain(books);

    const { result } = renderHook(() => useBooks());

    await act(async () => {
      await result.current.fetchBooks();
    });

    expect(result.current.books).toEqual(books);
  });

  it("sets loading to false after successful fetch", async () => {
    setupFetchBooksChain([makeBook()]);

    const { result } = renderHook(() => useBooks());

    await act(async () => {
      await result.current.fetchBooks();
    });

    expect(result.current.loading).toBe(false);
  });

  it("does nothing when user is null", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useBooks());

    await act(async () => {
      await result.current.fetchBooks();
    });

    expect(result.current.books).toEqual([]);
  });

  it("does not set books on fetch error", async () => {
    setupFetchBooksChain(null, { message: "db error" });

    const { result } = renderHook(() => useBooks());

    await act(async () => {
      await result.current.fetchBooks();
    });

    expect(result.current.books).toEqual([]);
  });

  it("sets books to [] when data is null", async () => {
    setupFetchBooksChain(null);

    const { result } = renderHook(() => useBooks());

    await act(async () => {
      await result.current.fetchBooks();
    });

    expect(result.current.books).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// addBook
// ---------------------------------------------------------------------------
describe("useBooks — addBook", () => {
  it("returns { error: 'Not authenticated' } when user is null", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useBooks());

    let response: Awaited<ReturnType<typeof result.current.addBook>>;
    await act(async () => {
      response = await result.current.addBook({ title: "New Book" });
    });

    expect(response!).toEqual({ error: "Not authenticated" });
  });

  it("prepends the new book to the list on success", async () => {
    const existing = makeBook({ id: "b-old" });
    const newBook = makeBook({ id: "b-new", title: "Brand New" });

    setupFetchBooksChain([existing]);
    const { result } = renderHook(() => useBooks());

    await act(async () => {
      await result.current.fetchBooks();
    });

    // set up insert mock
    mockSupabase.from.mockImplementation(() => ({
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: newBook, error: null })),
        })),
      })),
    }));

    await act(async () => {
      await result.current.addBook({ title: "Brand New" });
    });

    expect(result.current.books[0]).toEqual(newBook);
    expect(result.current.books[1]).toEqual(existing);
  });

  it("returns { error } when insert fails", async () => {
    // The useEffect fetchBooks chain also needs `select` to avoid unhandled rejection
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      insert: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() =>
            Promise.resolve({
              data: null,
              error: { message: "insert failed" },
            })
          ),
        })),
      })),
    }));

    const { result } = renderHook(() => useBooks());

    let response: Awaited<ReturnType<typeof result.current.addBook>>;
    await act(async () => {
      response = await result.current.addBook({ title: "Fail" });
    });

    expect(response!).toEqual({ error: "insert failed" });
  });
});

// ---------------------------------------------------------------------------
// updateBook
// ---------------------------------------------------------------------------
describe("useBooks — updateBook", () => {
  it("replaces the updated book in the list", async () => {
    const original = makeBook({ id: "b-1", status: "reading" });
    const updated = makeBook({ id: "b-1", status: "finished" });

    setupFetchBooksChain([original]);
    const { result } = renderHook(() => useBooks());

    await act(async () => {
      await result.current.fetchBooks();
    });

    mockSupabase.from.mockImplementation(() => ({
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({ data: updated, error: null })
            ),
          })),
        })),
      })),
    }));

    await act(async () => {
      await result.current.updateBook("b-1", { status: "finished" });
    });

    expect(result.current.books[0].status).toBe("finished");
  });

  it("auto-sets date_finished to today when status is 'finished' and no date is given", async () => {
    const today = new Date().toISOString().split("T")[0];

    let capturedUpdates: Record<string, unknown> = {};
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      update: vi.fn((updates: Record<string, unknown>) => {
        capturedUpdates = updates;
        return {
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() =>
                Promise.resolve({
                  data: makeBook({ status: "finished", date_finished: today }),
                  error: null,
                })
              ),
            })),
          })),
        };
      }),
    }));

    const { result } = renderHook(() => useBooks());

    await act(async () => {
      await result.current.updateBook("b-1", { status: "finished" });
    });

    expect(capturedUpdates.date_finished).toBe(today);
  });

  it("returns { error } when update fails", async () => {
    mockSupabase.from.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() =>
              Promise.resolve({
                data: null,
                error: { message: "update error" },
              })
            ),
          })),
        })),
      })),
    }));

    const { result } = renderHook(() => useBooks());

    let response: Awaited<ReturnType<typeof result.current.updateBook>>;
    await act(async () => {
      response = await result.current.updateBook("b-1", {
        status: "finished",
      });
    });

    expect(response!).toEqual({ error: "update error" });
  });
});

// ---------------------------------------------------------------------------
// importBooks
// ---------------------------------------------------------------------------
describe("useBooks — importBooks", () => {
  it("returns zeroes when user is null", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useBooks());

    let response: Awaited<ReturnType<typeof result.current.importBooks>>;
    await act(async () => {
      response = await result.current.importBooks([makeMapped()]);
    });

    expect(response!).toEqual({ imported: 0, skipped: 0, errors: 0 });
  });

  it("skips duplicate books already in the library", async () => {
    // Existing book with same title/author
    const existing = makeBook({
      title: "Mapped Book",
      author: "Mapped Author",
    });
    setupFetchBooksChain([existing]);

    const { result } = renderHook(() => useBooks());

    await act(async () => {
      await result.current.fetchBooks();
    });

    // importBooks with the same title/author → should skip
    mockSupabase.from.mockImplementation(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [existing], error: null })),
        })),
      })),
    }));

    let response: Awaited<ReturnType<typeof result.current.importBooks>>;
    await act(async () => {
      response = await result.current.importBooks([makeMapped()]);
    });

    expect(response!.skipped).toBe(1);
    expect(response!.imported).toBe(0);
  });

  it("counts inserted books as imported", async () => {
    setupFetchBooksChain([]);
    const { result } = renderHook(() => useBooks());

    await act(async () => {
      await result.current.fetchBooks();
    });

    mockSupabase.from.mockImplementation(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    }));

    let response: Awaited<ReturnType<typeof result.current.importBooks>>;
    await act(async () => {
      response = await result.current.importBooks([makeMapped()]);
    });

    expect(response!.imported).toBe(1);
    expect(response!.errors).toBe(0);
  });

  it("counts insert errors correctly", async () => {
    setupFetchBooksChain([]);
    const { result } = renderHook(() => useBooks());

    await act(async () => {
      await result.current.fetchBooks();
    });

    mockSupabase.from.mockImplementation(() => ({
      insert: vi.fn(() =>
        Promise.resolve({ error: { message: "insert error" } })
      ),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    }));

    let response: Awaited<ReturnType<typeof result.current.importBooks>>;
    await act(async () => {
      response = await result.current.importBooks([makeMapped()]);
    });

    expect(response!.errors).toBe(1);
    expect(response!.imported).toBe(0);
  });

  it("calls onProgress callback during import", async () => {
    setupFetchBooksChain([]);
    const { result } = renderHook(() => useBooks());

    await act(async () => {
      await result.current.fetchBooks();
    });

    mockSupabase.from.mockImplementation(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
      })),
    }));

    const onProgress = vi.fn();

    await act(async () => {
      await result.current.importBooks([makeMapped()], onProgress);
    });

    expect(onProgress).toHaveBeenCalledWith(1, 1);
  });
});
