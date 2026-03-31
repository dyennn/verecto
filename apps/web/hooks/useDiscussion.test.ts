import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useDiscussion } from "@/hooks/useDiscussion";
import type { DiscussionRow } from "@/hooks/useDiscussion";

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------
const mockMaybeSingle = vi.fn();

const mockSupabase = {
  from: vi.fn(() => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: mockMaybeSingle,
          })),
        })),
      })),
    })),
  })),
};

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// ---------------------------------------------------------------------------
// fetch mock
// ---------------------------------------------------------------------------
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeDiscussion(
  overrides: Partial<DiscussionRow> = {}
): DiscussionRow {
  return {
    id: "disc-1",
    user_id: "user-1",
    book_id: "book-1",
    model_used: "gpt-4",
    content: {
      hook: "A hook.",
      themes: [],
      character_spotlight: {
        character: "Hero",
        analysis: "Brave.",
        question: "Why?",
      },
      connection_to_reader: "Relatable.",
      closing_provocation: "Think on.",
    },
    created_at: "2026-01-01T00:00:00Z",
    progress_snapshot: null,
    chapter_number: null,
    total_chapters: null,
    perspective: "standard",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockMaybeSingle.mockResolvedValue({ data: null, error: null });
  mockFetch.mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ success: false }),
  });
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
describe("useDiscussion — initial state", () => {
  it("starts with discussion = null", () => {
    const { result } = renderHook(() => useDiscussion());
    expect(result.current.discussion).toBeNull();
  });

  it("starts with loading = false", () => {
    const { result } = renderHook(() => useDiscussion());
    expect(result.current.loading).toBe(false);
  });

  it("starts with generating = false", () => {
    const { result } = renderHook(() => useDiscussion());
    expect(result.current.generating).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// fetchDiscussion
// ---------------------------------------------------------------------------
describe("useDiscussion — fetchDiscussion", () => {
  it("sets discussion when data is found", async () => {
    const disc = makeDiscussion();
    mockMaybeSingle.mockResolvedValue({ data: disc, error: null });

    const { result } = renderHook(() => useDiscussion());

    await act(async () => {
      await result.current.fetchDiscussion("book-1");
    });

    expect(result.current.discussion).toEqual(disc);
  });

  it("sets loading to false after fetch", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useDiscussion());

    await act(async () => {
      await result.current.fetchDiscussion("book-1");
    });

    expect(result.current.loading).toBe(false);
  });

  it("sets discussion to null when no record is found", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useDiscussion());

    await act(async () => {
      await result.current.fetchDiscussion("book-1");
    });

    expect(result.current.discussion).toBeNull();
  });

  it("sets loading to false when fetch returns an error", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "db error" },
    });

    const { result } = renderHook(() => useDiscussion());

    await act(async () => {
      await result.current.fetchDiscussion("book-1");
    });

    expect(result.current.loading).toBe(false);
  });

  it("does not change discussion on fetch error", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: null,
      error: { message: "db error" },
    });

    const { result } = renderHook(() => useDiscussion());

    await act(async () => {
      await result.current.fetchDiscussion("book-1");
    });

    expect(result.current.discussion).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// generateDiscussion
// ---------------------------------------------------------------------------
describe("useDiscussion — generateDiscussion", () => {
  it("sets generating to false after completion", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: false }),
    });

    const { result } = renderHook(() => useDiscussion());

    await act(async () => {
      await result.current.generateDiscussion("book-1");
    });

    expect(result.current.generating).toBe(false);
  });

  it("sets discussion when API returns success=true", async () => {
    const disc = makeDiscussion();
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, discussion: disc }),
    });

    const { result } = renderHook(() => useDiscussion());

    await act(async () => {
      await result.current.generateDiscussion("book-1");
    });

    expect(result.current.discussion).toEqual(disc);
  });

  it("returns { data } on success", async () => {
    const disc = makeDiscussion();
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: true, discussion: disc }),
    });

    const { result } = renderHook(() => useDiscussion());

    let response: Awaited<ReturnType<typeof result.current.generateDiscussion>>;
    await act(async () => {
      response = await result.current.generateDiscussion("book-1");
    });

    expect(response!).toEqual({ data: disc });
  });

  it("returns { error } when response is not ok", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ success: false, error: "server error" }),
    });

    const { result } = renderHook(() => useDiscussion());

    let response: Awaited<ReturnType<typeof result.current.generateDiscussion>>;
    await act(async () => {
      response = await result.current.generateDiscussion("book-1");
    });

    expect(response!).toEqual({ error: "server error" });
  });

  it("returns a default error message when error field is missing", async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ success: false }),
    });

    const { result } = renderHook(() => useDiscussion());

    let response: Awaited<ReturnType<typeof result.current.generateDiscussion>>;
    await act(async () => {
      response = await result.current.generateDiscussion("book-1");
    });

    expect(response!).toEqual({ error: "Failed to generate discussion" });
  });

  it("returns { error } and sets generating=false when fetch throws", async () => {
    mockFetch.mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useDiscussion());

    let response: Awaited<ReturnType<typeof result.current.generateDiscussion>>;
    await act(async () => {
      response = await result.current.generateDiscussion("book-1");
    });

    expect(result.current.generating).toBe(false);
    expect(response!).toEqual({
      error: "Failed to generate discussion. Please try again.",
    });
  });

  it("sends the correct bookId and perspective to the API", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: false }),
    });

    const { result } = renderHook(() => useDiscussion());

    await act(async () => {
      await result.current.generateDiscussion("book-xyz", {
        perspective: "antagonist",
      });
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/discussion",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          bookId: "book-xyz",
          perspective: "antagonist",
        }),
      })
    );
  });

  it("defaults perspective to 'standard' when not provided", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ success: false }),
    });

    const { result } = renderHook(() => useDiscussion());

    await act(async () => {
      await result.current.generateDiscussion("book-1");
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/discussion",
      expect.objectContaining({
        body: JSON.stringify({ bookId: "book-1", perspective: "standard" }),
      })
    );
  });
});
