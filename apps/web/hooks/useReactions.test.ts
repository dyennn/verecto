import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useReactions } from "@/hooks/useReactions";
import type { ReactionEmoji } from "@/hooks/useReactions";

// ---------------------------------------------------------------------------
// Supabase mock
// ---------------------------------------------------------------------------
const mockGetUser = vi.fn();

// We build the from() chain dynamically per test
const mockFromImplementation = vi.fn();

const mockSupabase = {
  auth: { getUser: mockGetUser },
  from: mockFromImplementation,
};

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const ALL_EMOJIS: ReactionEmoji[] = ["💡", "❤️", "🔥", "👍", "👎"];

type ReactionRow = { user_id: string; emoji: string };

function makeSelectChain(
  data: ReactionRow[] | null,
  error: unknown = null
) {
  return {
    select: vi.fn(() => ({
      eq: vi.fn(() => Promise.resolve({ data, error })),
    })),
    delete: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => Promise.resolve({ error: null })),
        })),
      })),
    })),
    insert: vi.fn(() => Promise.resolve({ error: null })),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-me" } } });
  mockFromImplementation.mockImplementation(() =>
    makeSelectChain([])
  );
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
describe("useReactions — initial state", () => {
  it("starts with loading = true", () => {
    const { result } = renderHook(() => useReactions("disc-1"));
    expect(result.current.loading).toBe(true);
  });

  it("starts with all emoji arrays empty", () => {
    const { result } = renderHook(() => useReactions("disc-1"));
    for (const emoji of ALL_EMOJIS) {
      expect(result.current.reactions[emoji]).toEqual([]);
    }
  });

  it("starts with currentUserId = null", () => {
    const { result } = renderHook(() => useReactions("disc-1"));
    expect(result.current.currentUserId).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// fetchReactions (called in useEffect on mount)
// ---------------------------------------------------------------------------
describe("useReactions — after fetch", () => {
  it("sets loading to false after fetching", async () => {
    const { result } = renderHook(() => useReactions("disc-1"));
    // Wait for the useEffect to complete
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current.loading).toBe(false);
  });

  it("sets currentUserId from the auth user", async () => {
    const { result } = renderHook(() => useReactions("disc-1"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current.currentUserId).toBe("user-me");
  });

  it("sets currentUserId to null when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useReactions("disc-1"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(result.current.currentUserId).toBeNull();
  });

  it("populates reaction arrays from fetched rows", async () => {
    const rows: ReactionRow[] = [
      { user_id: "user-a", emoji: "💡" },
      { user_id: "user-b", emoji: "💡" },
      { user_id: "user-c", emoji: "🔥" },
    ];

    mockFromImplementation.mockImplementation(() =>
      makeSelectChain(rows)
    );

    const { result } = renderHook(() => useReactions("disc-1"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.reactions["💡"]).toEqual(["user-a", "user-b"]);
    expect(result.current.reactions["🔥"]).toEqual(["user-c"]);
    expect(result.current.reactions["❤️"]).toEqual([]);
  });

  it("ignores rows with unrecognized emoji values", async () => {
    const rows = [
      { user_id: "user-a", emoji: "unknown-emoji" },
      { user_id: "user-b", emoji: "💡" },
    ] as ReactionRow[];

    mockFromImplementation.mockImplementation(() =>
      makeSelectChain(rows)
    );

    const { result } = renderHook(() => useReactions("disc-1"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.reactions["💡"]).toEqual(["user-b"]);
  });

  it("handles empty data gracefully", async () => {
    mockFromImplementation.mockImplementation(() =>
      makeSelectChain([])
    );

    const { result } = renderHook(() => useReactions("disc-1"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    for (const emoji of ALL_EMOJIS) {
      expect(result.current.reactions[emoji]).toEqual([]);
    }
  });

  it("sets loading to false even when fetch returns an error", async () => {
    mockFromImplementation.mockImplementation(() =>
      makeSelectChain(null, { message: "db error" })
    );

    const { result } = renderHook(() => useReactions("disc-1"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.loading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// toggle — optimistic update
// ---------------------------------------------------------------------------
describe("useReactions — toggle", () => {
  it("does nothing if currentUserId is null", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useReactions("disc-1"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const reactionsBefore = { ...result.current.reactions };

    await act(async () => {
      await result.current.toggle("💡");
    });

    expect(result.current.reactions).toEqual(reactionsBefore);
  });

  it("optimistically adds the current user when they have not yet reacted", async () => {
    const { result } = renderHook(() => useReactions("disc-1"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await act(async () => {
      await result.current.toggle("❤️");
    });

    expect(result.current.reactions["❤️"]).toContain("user-me");
  });

  it("optimistically removes the current user when they have already reacted", async () => {
    const rows: ReactionRow[] = [{ user_id: "user-me", emoji: "💡" }];
    mockFromImplementation.mockImplementation(() =>
      makeSelectChain(rows)
    );

    const { result } = renderHook(() => useReactions("disc-1"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    // user-me has reacted to 💡, toggling should remove them
    await act(async () => {
      await result.current.toggle("💡");
    });

    expect(result.current.reactions["💡"]).not.toContain("user-me");
  });

  it("calls insert when user has not yet reacted", async () => {
    const insertMock = vi.fn(() => Promise.resolve({ error: null }));
    mockFromImplementation.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
      })),
      insert: insertMock,
      delete: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ error: null })),
          })),
        })),
      })),
    }));

    const { result } = renderHook(() => useReactions("disc-1"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await act(async () => {
      await result.current.toggle("🔥");
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        discussion_id: "disc-1",
        user_id: "user-me",
        emoji: "🔥",
      })
    );
  });

  it("calls delete when user has already reacted", async () => {
    const rows: ReactionRow[] = [{ user_id: "user-me", emoji: "💡" }];
    const innerEqMock = vi.fn(() => Promise.resolve({ error: null }));
    const midEqMock = vi.fn(() => ({ eq: innerEqMock }));
    const outerEqMock = vi.fn(() => ({ eq: midEqMock }));
    const deleteMock = vi.fn(() => ({ eq: outerEqMock }));

    mockFromImplementation.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: rows, error: null })),
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      delete: deleteMock,
    }));

    const { result } = renderHook(() => useReactions("disc-1"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await act(async () => {
      await result.current.toggle("💡");
    });

    expect(deleteMock).toHaveBeenCalled();
  });

  it("does not affect other emojis when toggling one", async () => {
    const rows: ReactionRow[] = [
      { user_id: "user-a", emoji: "🔥" },
      { user_id: "user-b", emoji: "👍" },
    ];
    mockFromImplementation.mockImplementation(() =>
      makeSelectChain(rows)
    );

    const { result } = renderHook(() => useReactions("disc-1"));
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    const fireBefore = [...result.current.reactions["🔥"]];

    await act(async () => {
      await result.current.toggle("❤️");
    });

    // 🔥 should still have user-a
    expect(result.current.reactions["🔥"]).toEqual(fireBefore);
    expect(result.current.reactions["👍"]).toContain("user-b");
  });
});
