import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useRecommendations } from "@/hooks/useRecommendations";
import type { RecommendedBook } from "@/hooks/useRecommendations";

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------
const mockGetUser = vi.fn();
const mockSingle = vi.fn();

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: mockSingle,
        })),
      })),
    })),
  })),
};

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// ---------------------------------------------------------------------------
// fetch() mock (for generateRecommendations)
// ---------------------------------------------------------------------------
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeBook(overrides: Partial<RecommendedBook> = {}): RecommendedBook {
  return {
    title: "A Good Book",
    author: "An Author",
    reason: "Because it is great.",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  mockSingle.mockResolvedValue({ data: null, error: null });
  mockFetch.mockResolvedValue({
    json: vi.fn().mockResolvedValue({ success: false }),
  });
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
describe("useRecommendations — initial state", () => {
  it("starts with an empty recommendations array", () => {
    const { result } = renderHook(() => useRecommendations());
    expect(result.current.recommendations).toEqual([]);
  });

  it("starts with loading = false", () => {
    const { result } = renderHook(() => useRecommendations());
    expect(result.current.loading).toBe(false);
  });

  it("starts with generating = false", () => {
    const { result } = renderHook(() => useRecommendations());
    expect(result.current.generating).toBe(false);
  });

  it("exposes fetchRecommendations and generateRecommendations", () => {
    const { result } = renderHook(() => useRecommendations());
    expect(typeof result.current.fetchRecommendations).toBe("function");
    expect(typeof result.current.generateRecommendations).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// fetchRecommendations
// ---------------------------------------------------------------------------
describe("useRecommendations — fetchRecommendations", () => {
  it("sets loading to false after fetch resolves", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useRecommendations());

    await act(async () => {
      await result.current.fetchRecommendations("book-1");
    });

    expect(result.current.loading).toBe(false);
  });

  it("sets recommendations from cached data when available", async () => {
    const books: RecommendedBook[] = [
      makeBook({ title: "Book A" }),
      makeBook({ title: "Book B" }),
    ];
    mockSingle.mockResolvedValue({
      data: { recommended_books: books },
      error: null,
    });

    const { result } = renderHook(() => useRecommendations());

    await act(async () => {
      await result.current.fetchRecommendations("book-1");
    });

    expect(result.current.recommendations).toEqual(books);
  });

  it("leaves recommendations empty when no cached data exists", async () => {
    mockSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useRecommendations());

    await act(async () => {
      await result.current.fetchRecommendations("book-1");
    });

    expect(result.current.recommendations).toEqual([]);
  });

  it("returns early and sets loading to false when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useRecommendations());

    await act(async () => {
      await result.current.fetchRecommendations("book-1");
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.recommendations).toEqual([]);
  });

  it("does not call the database when user is null", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useRecommendations());

    await act(async () => {
      await result.current.fetchRecommendations("book-1");
    });

    expect(mockSingle).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// generateRecommendations
// ---------------------------------------------------------------------------
describe("useRecommendations — generateRecommendations", () => {
  it("sets generating to false after the request completes", async () => {
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: false }),
    });

    const { result } = renderHook(() => useRecommendations());

    await act(async () => {
      await result.current.generateRecommendations("book-1");
    });

    expect(result.current.generating).toBe(false);
  });

  it("sets recommendations when API returns success=true", async () => {
    const books: RecommendedBook[] = [
      makeBook({ title: "Generated Book" }),
    ];
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: true, recommendations: books }),
    });

    const { result } = renderHook(() => useRecommendations());

    await act(async () => {
      await result.current.generateRecommendations("book-1");
    });

    expect(result.current.recommendations).toEqual(books);
  });

  it("does not update recommendations when API returns success=false", async () => {
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: false }),
    });

    const { result } = renderHook(() => useRecommendations());

    await act(async () => {
      await result.current.generateRecommendations("book-1");
    });

    expect(result.current.recommendations).toEqual([]);
  });

  it("calls the /api/recommendations endpoint with the correct bookId", async () => {
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: false }),
    });

    const { result } = renderHook(() => useRecommendations());

    await act(async () => {
      await result.current.generateRecommendations("book-xyz");
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/recommendations",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ bookId: "book-xyz" }),
      })
    );
  });

  it("sets generating to false even when fetch throws", async () => {
    mockFetch.mockRejectedValue(new Error("network failure"));

    const { result } = renderHook(() => useRecommendations());

    await act(async () => {
      // The hook uses try/finally, so generating=false even on throw
      try {
        await result.current.generateRecommendations("book-1");
      } catch {
        // swallow
      }
    });

    expect(result.current.generating).toBe(false);
  });

  it("does not call the API more than once per generate call", async () => {
    mockFetch.mockResolvedValue({
      json: vi.fn().mockResolvedValue({ success: true, recommendations: [] }),
    });

    const { result } = renderHook(() => useRecommendations());

    await act(async () => {
      await result.current.generateRecommendations("book-1");
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("replaces existing recommendations on a new generation", async () => {
    const first: RecommendedBook[] = [makeBook({ title: "First" })];
    const second: RecommendedBook[] = [
      makeBook({ title: "Second A" }),
      makeBook({ title: "Second B" }),
    ];

    mockFetch
      .mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({ success: true, recommendations: first }),
      })
      .mockResolvedValueOnce({
        json: vi.fn().mockResolvedValue({ success: true, recommendations: second }),
      });

    const { result } = renderHook(() => useRecommendations());

    await act(async () => {
      await result.current.generateRecommendations("book-1");
    });

    expect(result.current.recommendations).toEqual(first);

    await act(async () => {
      await result.current.generateRecommendations("book-1");
    });

    expect(result.current.recommendations).toEqual(second);
  });
});
