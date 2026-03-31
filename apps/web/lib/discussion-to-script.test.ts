import { describe, it, expect } from "vitest";
import { discussionToScript } from "@/lib/discussion-to-script";

vi.mock("@/lib/openrouter", () => ({}));

// ---------------------------------------------------------------------------
// Type definitions mirrored here so tests have no runtime dependency on
// the real openrouter module.
// ---------------------------------------------------------------------------
interface DiscussionTheme {
  title: string;
  insight: string;
  question: string;
}

interface DiscussionGuide {
  hook: string;
  themes: DiscussionTheme[];
  character_spotlight: {
    character: string;
    analysis: string;
    question: string;
  };
  connection_to_reader: string;
  closing_provocation: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeGuide(overrides: Partial<DiscussionGuide> = {}): DiscussionGuide {
  return {
    hook: "An opening hook sentence.",
    themes: [
      {
        title: "Theme One",
        insight: "Insight for theme one.",
        question: "Question for theme one?",
      },
    ],
    character_spotlight: {
      character: "Jane Doe",
      analysis: "She is complex.",
      question: "What drives her?",
    },
    connection_to_reader: "This resonates with everyday life.",
    closing_provocation: "Leave them thinking.",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
describe("discussionToScript", () => {
  // -------------------------------------------------------------------------
  // Single theme — full output structure
  // -------------------------------------------------------------------------
  describe("single theme", () => {
    it("produces the correct full output", () => {
      const guide = makeGuide();
      const result = discussionToScript(guide, "My Book");

      const expected = [
        "My Book. A Verecto discussion.",
        "",
        "An opening hook sentence.",
        "",
        "Theme 1: Theme One. Insight for theme one. Question for theme one?",
        "",
        "Character spotlight: Jane Doe. She is complex. What drives her?",
        "",
        "A note just for you: This resonates with everyday life.",
        "",
        "And finally: Leave them thinking.",
      ].join("\n");

      expect(result).toBe(expected);
    });

    it("starts with the book title header", () => {
      const result = discussionToScript(makeGuide(), "Hamlet");
      expect(result.startsWith("Hamlet. A Verecto discussion.")).toBe(true);
    });

    it("ends with the closing provocation and no trailing newline", () => {
      const guide = makeGuide({ closing_provocation: "Final thought here." });
      const result = discussionToScript(guide, "My Book");
      expect(result.endsWith("And finally: Final thought here.")).toBe(true);
      expect(result.at(-1)).not.toBe("\n");
    });
  });

  // -------------------------------------------------------------------------
  // Multiple themes
  // -------------------------------------------------------------------------
  describe("multiple themes", () => {
    it("numbers three themes correctly and includes all of them", () => {
      const guide = makeGuide({
        themes: [
          { title: "Alpha", insight: "Insight A.", question: "Question A?" },
          { title: "Beta", insight: "Insight B.", question: "Question B?" },
          { title: "Gamma", insight: "Insight C.", question: "Question C?" },
        ],
      });

      const result = discussionToScript(guide, "Triple Book");

      expect(result).toContain("Theme 1: Alpha. Insight A. Question A?");
      expect(result).toContain("Theme 2: Beta. Insight B. Question B?");
      expect(result).toContain("Theme 3: Gamma. Insight C. Question C?");
    });

    it("separates each theme from the next with a blank line", () => {
      const guide = makeGuide({
        themes: [
          { title: "A", insight: "Insight A.", question: "Q A?" },
          { title: "B", insight: "Insight B.", question: "Q B?" },
        ],
      });

      const result = discussionToScript(guide, "Book");
      const lines = result.split("\n");

      const theme1Idx = lines.findIndex((l) =>
        l.startsWith("Theme 1:")
      );
      const theme2Idx = lines.findIndex((l) =>
        l.startsWith("Theme 2:")
      );

      expect(theme1Idx).toBeGreaterThanOrEqual(0);
      expect(theme2Idx).toBeGreaterThanOrEqual(0);
      // The line immediately after Theme 1 must be blank
      expect(lines[theme1Idx + 1]).toBe("");
      // The blank line is immediately before Theme 2
      expect(lines[theme2Idx - 1]).toBe("");
    });

    it("places the character spotlight after all themes", () => {
      const guide = makeGuide({
        themes: [
          { title: "X", insight: "Ix.", question: "Qx?" },
          { title: "Y", insight: "Iy.", question: "Qy?" },
        ],
      });

      const result = discussionToScript(guide, "Book");
      const lines = result.split("\n");

      const lastThemeIdx = lines.findLastIndex((l) =>
        l.startsWith("Theme ")
      );
      const spotlightIdx = lines.findIndex((l) =>
        l.startsWith("Character spotlight:")
      );

      expect(spotlightIdx).toBeGreaterThan(lastThemeIdx);
    });
  });

  // -------------------------------------------------------------------------
  // Empty themes array
  // -------------------------------------------------------------------------
  describe("empty themes array", () => {
    it("omits the themes section entirely", () => {
      const guide = makeGuide({ themes: [] });
      const result = discussionToScript(guide, "No Themes Book");
      expect(result).not.toContain("Theme ");
    });

    it("still includes all other sections when themes is empty", () => {
      const guide = makeGuide({ themes: [] });
      const result = discussionToScript(guide, "No Themes Book");

      expect(result).toContain("No Themes Book. A Verecto discussion.");
      expect(result).toContain(guide.hook);
      expect(result).toContain("Character spotlight:");
      expect(result).toContain("A note just for you:");
      expect(result).toContain("And finally:");
    });

    it("produces the correct full output when themes is empty", () => {
      const guide = makeGuide({ themes: [] });
      const result = discussionToScript(guide, "No Themes Book");

      const expected = [
        "No Themes Book. A Verecto discussion.",
        "",
        "An opening hook sentence.",
        "",
        "Character spotlight: Jane Doe. She is complex. What drives her?",
        "",
        "A note just for you: This resonates with everyday life.",
        "",
        "And finally: Leave them thinking.",
      ].join("\n");

      expect(result).toBe(expected);
    });
  });

  // -------------------------------------------------------------------------
  // Blank line structure
  // -------------------------------------------------------------------------
  describe("blank line separators", () => {
    it("places a blank line between the book title and the hook", () => {
      const result = discussionToScript(makeGuide(), "My Book");
      const lines = result.split("\n");

      const titleIdx = lines.findIndex((l) =>
        l.endsWith(". A Verecto discussion.")
      );
      expect(lines[titleIdx + 1]).toBe("");
    });

    it("places a blank line between the hook and the first theme", () => {
      const result = discussionToScript(makeGuide(), "My Book");
      const lines = result.split("\n");

      const hookIdx = lines.findIndex((l) => l === makeGuide().hook);
      expect(lines[hookIdx + 1]).toBe("");
    });

    it("places a blank line between the character spotlight and the reader note", () => {
      const result = discussionToScript(makeGuide(), "My Book");
      const lines = result.split("\n");

      const spotlightIdx = lines.findIndex((l) =>
        l.startsWith("Character spotlight:")
      );
      expect(lines[spotlightIdx + 1]).toBe("");
    });

    it("places a blank line between the reader note and the closing provocation", () => {
      const result = discussionToScript(makeGuide(), "My Book");
      const lines = result.split("\n");

      const readerNoteIdx = lines.findIndex((l) =>
        l.startsWith("A note just for you:")
      );
      expect(lines[readerNoteIdx + 1]).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // Special characters
  // -------------------------------------------------------------------------
  describe("special characters", () => {
    it("preserves Unicode characters in the book title", () => {
      const result = discussionToScript(makeGuide(), "L'Étranger");
      expect(result.startsWith("L'Étranger. A Verecto discussion.")).toBe(true);
    });

    it("preserves emojis in field values", () => {
      const guide = makeGuide({ hook: "What does it mean to be human? 🤔" });
      const result = discussionToScript(guide, "Emoji Book");
      expect(result).toContain("What does it mean to be human? 🤔");
    });

    it("preserves SQL-like special characters without escaping", () => {
      const guide = makeGuide({
        hook: "It's a trap — or is it? (100% sure)",
        themes: [
          {
            title: "Power & Control",
            insight: "Quotes: \"hello\" and 'world'.",
            question: "SELECT * FROM life WHERE meaning IS NULL?",
          },
        ],
      });

      const result = discussionToScript(guide, "SQL Book");

      expect(result).toContain("It's a trap — or is it? (100% sure)");
      expect(result).toContain("Power & Control");
      expect(result).toContain(`Quotes: "hello" and 'world'.`);
      expect(result).toContain(
        "SELECT * FROM life WHERE meaning IS NULL?"
      );
    });

    it("preserves newline-like whitespace within field values verbatim", () => {
      const guide = makeGuide({
        connection_to_reader: "Line one\tTabbed content",
      });
      const result = discussionToScript(guide, "Tab Book");
      expect(result).toContain("A note just for you: Line one\tTabbed content");
    });

    it("handles an empty string for hook without breaking structure", () => {
      const guide = makeGuide({ hook: "" });
      const result = discussionToScript(guide, "Empty Hook Book");
      const lines = result.split("\n");

      // Title is line 0, blank is line 1, hook (empty string) is line 2
      expect(lines[0]).toBe("Empty Hook Book. A Verecto discussion.");
      expect(lines[1]).toBe("");
      expect(lines[2]).toBe("");
    });
  });

  // -------------------------------------------------------------------------
  // Section content accuracy
  // -------------------------------------------------------------------------
  describe("section content accuracy", () => {
    it("formats the character spotlight line correctly", () => {
      const guide = makeGuide({
        character_spotlight: {
          character: "Victor Frankenstein",
          analysis: "He is driven by hubris.",
          question: "Can ambition ever be innocent?",
        },
      });

      const result = discussionToScript(guide, "Frankenstein");

      expect(result).toContain(
        "Character spotlight: Victor Frankenstein. He is driven by hubris. Can ambition ever be innocent?"
      );
    });

    it("formats the reader note correctly", () => {
      const guide = makeGuide({
        connection_to_reader: "This mirrors your own journey.",
      });

      const result = discussionToScript(guide, "Mirror Book");
      expect(result).toContain(
        "A note just for you: This mirrors your own journey."
      );
    });

    it("formats the closing provocation correctly", () => {
      const guide = makeGuide({
        closing_provocation: "Would you make the same choice?",
      });

      const result = discussionToScript(guide, "Choice Book");
      expect(result).toContain("And finally: Would you make the same choice?");
    });

    it("formats a theme line as 'Theme N: title. insight question'", () => {
      const guide = makeGuide({
        themes: [
          {
            title: "Identity",
            insight: "Characters wrestle with who they are.",
            question: "What defines a person?",
          },
        ],
      });

      const result = discussionToScript(guide, "Identity Book");
      expect(result).toContain(
        "Theme 1: Identity. Characters wrestle with who they are. What defines a person?"
      );
    });
  });
});
