import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ReactionBar } from "@/components/ReactionBar";
import type { ReactionsMap, ReactionEmoji } from "@/hooks/useReactions";

// ---------------------------------------------------------------------------
// Mock useReactions so ReactionBar has no Supabase dependency
// ---------------------------------------------------------------------------
const mockToggle = vi.fn();

function makeReactionsMap(
  overrides: Partial<Record<ReactionEmoji, string[]>> = {}
): ReactionsMap {
  const base: ReactionsMap = {
    "💡": [],
    "❤️": [],
    "🔥": [],
    "👍": [],
    "👎": [],
  };
  return { ...base, ...overrides };
}

vi.mock("@/hooks/useReactions", () => ({
  useReactions: vi.fn(() => ({
    reactions: makeReactionsMap(),
    toggle: mockToggle,
    loading: false,
    currentUserId: null,
  })),
}));

// Re-import after mock is set up
import { useReactions } from "@/hooks/useReactions";
const mockUseReactions = vi.mocked(useReactions);

beforeEach(() => {
  vi.clearAllMocks();
  mockUseReactions.mockReturnValue({
    reactions: makeReactionsMap(),
    toggle: mockToggle,
    loading: false,
    currentUserId: null,
  });
});

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe("ReactionBar — rendering", () => {
  it("renders nothing while loading", () => {
    mockUseReactions.mockReturnValue({
      reactions: makeReactionsMap(),
      toggle: mockToggle,
      loading: true,
      currentUserId: null,
    });

    const { container } = render(<ReactionBar discussionId="disc-1" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders 5 emoji buttons when not loading", () => {
    render(<ReactionBar discussionId="disc-1" />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(5);
  });

  it("renders all 5 expected emoji buttons", () => {
    render(<ReactionBar discussionId="disc-1" />);
    const emojis = ["💡", "❤️", "🔥", "👍", "👎"];
    for (const emoji of emojis) {
      expect(screen.getByText(emoji)).toBeDefined();
    }
  });

  it("passes discussionId to useReactions", () => {
    render(<ReactionBar discussionId="test-disc-123" />);
    expect(mockUseReactions).toHaveBeenCalledWith("test-disc-123");
  });
});

// ---------------------------------------------------------------------------
// Reaction counts
// ---------------------------------------------------------------------------
describe("ReactionBar — reaction counts", () => {
  it("does not render a count badge when count is 0", () => {
    render(<ReactionBar discussionId="disc-1" />);
    // No numeric text content visible for zero counts
    expect(screen.queryByText("0")).toBeNull();
  });

  it("renders the count when a reaction has 1 user", () => {
    mockUseReactions.mockReturnValue({
      reactions: makeReactionsMap({ "💡": ["user-a"] }),
      toggle: mockToggle,
      loading: false,
      currentUserId: null,
    });

    render(<ReactionBar discussionId="disc-1" />);
    expect(screen.getByText("1")).toBeDefined();
  });

  it("renders the correct count when multiple users have reacted", () => {
    mockUseReactions.mockReturnValue({
      reactions: makeReactionsMap({
        "🔥": ["user-a", "user-b", "user-c"],
      }),
      toggle: mockToggle,
      loading: false,
      currentUserId: null,
    });

    render(<ReactionBar discussionId="disc-1" />);
    expect(screen.getByText("3")).toBeDefined();
  });

  it("renders counts for multiple emojis simultaneously", () => {
    mockUseReactions.mockReturnValue({
      reactions: makeReactionsMap({
        "💡": ["user-a", "user-b"],
        "❤️": ["user-c"],
      }),
      toggle: mockToggle,
      loading: false,
      currentUserId: null,
    });

    render(<ReactionBar discussionId="disc-1" />);
    expect(screen.getByText("2")).toBeDefined();
    expect(screen.getByText("1")).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// "Already reacted" styling
// ---------------------------------------------------------------------------
describe("ReactionBar — reacted state", () => {
  it("applies the ring class to a button the current user has reacted to", () => {
    const currentUserId = "user-me";
    mockUseReactions.mockReturnValue({
      reactions: makeReactionsMap({ "💡": [currentUserId] }),
      toggle: mockToggle,
      loading: false,
      currentUserId,
    });

    const { container } = render(<ReactionBar discussionId="disc-1" />);
    const buttons = container.querySelectorAll("button");
    // The 💡 button (first) should have the ring class
    const lightbulbBtn = Array.from(buttons).find((b) =>
      b.textContent?.includes("💡")
    );
    expect(lightbulbBtn?.className).toContain("ring-1");
  });

  it("does not apply the ring class to a button the current user has NOT reacted to", () => {
    const currentUserId = "user-me";
    mockUseReactions.mockReturnValue({
      reactions: makeReactionsMap({ "💡": [currentUserId] }),
      toggle: mockToggle,
      loading: false,
      currentUserId,
    });

    const { container } = render(<ReactionBar discussionId="disc-1" />);
    const buttons = container.querySelectorAll("button");
    const heartBtn = Array.from(buttons).find((b) =>
      b.textContent?.includes("❤️")
    );
    expect(heartBtn?.className).not.toContain("ring-1");
  });

  it("has title='Add reaction' when user has not reacted", () => {
    mockUseReactions.mockReturnValue({
      reactions: makeReactionsMap(),
      toggle: mockToggle,
      loading: false,
      currentUserId: "user-me",
    });

    render(<ReactionBar discussionId="disc-1" />);
    const buttons = screen.getAllByTitle("Add reaction");
    expect(buttons).toHaveLength(5);
  });

  it("has title='Remove reaction' when user has reacted", () => {
    mockUseReactions.mockReturnValue({
      reactions: makeReactionsMap({ "💡": ["user-me"] }),
      toggle: mockToggle,
      loading: false,
      currentUserId: "user-me",
    });

    render(<ReactionBar discussionId="disc-1" />);
    const removeButtons = screen.getAllByTitle("Remove reaction");
    expect(removeButtons).toHaveLength(1);
    const addButtons = screen.getAllByTitle("Add reaction");
    expect(addButtons).toHaveLength(4);
  });

  it("does not apply reacted style when currentUserId is null even if reactions exist", () => {
    mockUseReactions.mockReturnValue({
      reactions: makeReactionsMap({ "💡": ["some-other-user"] }),
      toggle: mockToggle,
      loading: false,
      currentUserId: null,
    });

    const { container } = render(<ReactionBar discussionId="disc-1" />);
    const buttons = container.querySelectorAll("button");
    const lightbulbBtn = Array.from(buttons).find((b) =>
      b.textContent?.includes("💡")
    );
    // No ring since currentUserId is null
    expect(lightbulbBtn?.className).not.toContain("ring-1");
  });
});

// ---------------------------------------------------------------------------
// Interactions
// ---------------------------------------------------------------------------
describe("ReactionBar — interactions", () => {
  it("calls toggle with the correct emoji when a button is clicked", () => {
    render(<ReactionBar discussionId="disc-1" />);
    const fireBtn = screen.getByText("🔥").closest("button")!;
    fireEvent.click(fireBtn);
    expect(mockToggle).toHaveBeenCalledWith("🔥");
  });

  it("calls toggle with the thumbs-down emoji when that button is clicked", () => {
    render(<ReactionBar discussionId="disc-1" />);
    const thumbsDownBtn = screen.getByText("👎").closest("button")!;
    fireEvent.click(thumbsDownBtn);
    expect(mockToggle).toHaveBeenCalledWith("👎");
  });

  it("calls toggle exactly once per click", () => {
    render(<ReactionBar discussionId="disc-1" />);
    const btn = screen.getByText("👍").closest("button")!;
    fireEvent.click(btn);
    expect(mockToggle).toHaveBeenCalledTimes(1);
  });
});
