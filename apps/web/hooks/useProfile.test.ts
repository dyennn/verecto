import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useProfile } from "@/hooks/useProfile";
import type { ProfileRow } from "@/hooks/useProfile";

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
  })),
};

vi.mock("@/lib/supabase", () => ({
  createClient: vi.fn(() => mockSupabase),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeProfile(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    id: "user-1",
    username: "reader_one",
    favorite_genres: ["Fantasy"],
    top_moods: ["loved_it"],
    reading_streak: 3,
    last_read_date: "2026-03-15",
    avatar_url: null,
    bio: "I love books.",
    reading_goal_per_year: 12,
    discussion_style: "casual",
    created_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
  mockSingle.mockResolvedValue({ data: null, error: null });
});

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------
describe("useProfile — initial state", () => {
  it("starts with profile = null", () => {
    const { result } = renderHook(() => useProfile());
    expect(result.current.profile).toBeNull();
  });

  it("starts with loading = true", () => {
    const { result } = renderHook(() => useProfile());
    expect(result.current.loading).toBe(true);
  });

  it("exposes fetchProfile and updateProfile", () => {
    const { result } = renderHook(() => useProfile());
    expect(typeof result.current.fetchProfile).toBe("function");
    expect(typeof result.current.updateProfile).toBe("function");
  });
});

// ---------------------------------------------------------------------------
// fetchProfile (called in useEffect on mount)
// ---------------------------------------------------------------------------
describe("useProfile — fetchProfile", () => {
  it("sets profile data when fetch succeeds", async () => {
    const profile = makeProfile();
    mockSingle.mockResolvedValue({ data: profile, error: null });

    const { result } = renderHook(() => useProfile());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.profile).toEqual(profile);
  });

  it("sets loading to false after fetch succeeds", async () => {
    mockSingle.mockResolvedValue({ data: makeProfile(), error: null });

    const { result } = renderHook(() => useProfile());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.loading).toBe(false);
  });

  it("does not set profile when user is null", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useProfile());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.profile).toBeNull();
  });

  it("does not crash when fetch returns an error", async () => {
    mockSingle.mockResolvedValue({
      data: null,
      error: { message: "not found" },
    });

    const { result } = renderHook(() => useProfile());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(result.current.profile).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateProfile
// ---------------------------------------------------------------------------
describe("useProfile — updateProfile", () => {
  it("returns { error: 'Not authenticated' } when no user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useProfile());

    let response: Awaited<ReturnType<typeof result.current.updateProfile>>;
    await act(async () => {
      response = await result.current.updateProfile({ username: "new_name" });
    });

    expect(response!).toEqual({ error: "Not authenticated" });
  });

  it("updates the profile in state on success", async () => {
    const updatedProfile = makeProfile({ username: "updated_user" });

    // First fetch — set initial profile
    mockSingle.mockResolvedValueOnce({ data: makeProfile(), error: null });
    // Second call — update
    mockSingle.mockResolvedValueOnce({
      data: updatedProfile,
      error: null,
    });

    const { result } = renderHook(() => useProfile());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    await act(async () => {
      await result.current.updateProfile({ username: "updated_user" });
    });

    expect(result.current.profile?.username).toBe("updated_user");
  });

  it("returns { data } on successful update", async () => {
    const updatedProfile = makeProfile({ username: "new" });
    mockSingle.mockResolvedValueOnce({ data: makeProfile(), error: null });
    mockSingle.mockResolvedValueOnce({ data: updatedProfile, error: null });

    const { result } = renderHook(() => useProfile());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    let response: Awaited<ReturnType<typeof result.current.updateProfile>>;
    await act(async () => {
      response = await result.current.updateProfile({ username: "new" });
    });

    expect(response!).toEqual({ data: updatedProfile });
  });

  it("returns { error } when update fails", async () => {
    mockSingle.mockResolvedValueOnce({ data: makeProfile(), error: null });
    mockSingle.mockResolvedValueOnce({
      data: null,
      error: { message: "update failed" },
    });

    const { result } = renderHook(() => useProfile());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    let response: Awaited<ReturnType<typeof result.current.updateProfile>>;
    await act(async () => {
      response = await result.current.updateProfile({ username: "fail" });
    });

    expect(response!).toEqual({ error: "update failed" });
  });
});
