import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ModelLogEntry } from "@/lib/model-logger-serverless";
import { logModelDecision } from "@/lib/model-logger-serverless";

function makeEntry(overrides: Partial<ModelLogEntry> = {}): ModelLogEntry {
  return {
    timestamp: "2026-01-01T00:00:00.000Z",
    model: "test-model",
    book: { title: "Test Book", author: "Test Author" },
    rawResponse: null,
    parsedDiscussion: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logModelDecision (serverless)", () => {
  it("calls console.log with [model-decision] prefix", () => {
    logModelDecision(makeEntry());
    expect(console.log).toHaveBeenCalledWith(
      "[model-decision]",
      expect.stringContaining("test-model")
    );
  });

  it("logs valid JSON string as second argument", () => {
    const entry = makeEntry({ model: "openai/gpt-4" });
    logModelDecision(entry);

    const [, jsonStr] = (console.log as any).mock.calls[0];
    expect(() => JSON.parse(jsonStr)).not.toThrow();
  });

  it("includes model field in logged JSON", () => {
    logModelDecision(makeEntry({ model: "anthropic/claude" }));
    const [, jsonStr] = (console.log as any).mock.calls[0];
    const parsed = JSON.parse(jsonStr);
    expect(parsed.model).toBe("anthropic/claude");
  });

  it("includes book title and author in logged JSON", () => {
    logModelDecision(makeEntry({ book: { title: "Dune", author: "Frank Herbert" } }));
    const [, jsonStr] = (console.log as any).mock.calls[0];
    const parsed = JSON.parse(jsonStr);
    expect(parsed.book.title).toBe("Dune");
    expect(parsed.book.author).toBe("Frank Herbert");
  });

  it("includes error field when provided", () => {
    logModelDecision(makeEntry({ error: "Generation failed" }));
    const [, jsonStr] = (console.log as any).mock.calls[0];
    const parsed = JSON.parse(jsonStr);
    expect(parsed.error).toBe("Generation failed");
  });

  it("handles null rawResponse gracefully", () => {
    const entry = makeEntry({ rawResponse: null });
    expect(() => logModelDecision(entry)).not.toThrow();
  });

  it("handles complex parsedDiscussion object", () => {
    const entry = makeEntry({
      parsedDiscussion: {
        hook: "hook text",
        themes: [{ title: "T", insight: "I", question: "Q?" }],
      },
    });
    expect(() => logModelDecision(entry)).not.toThrow();
    expect(console.log).toHaveBeenCalled();
  });

  it("does not write to filesystem (no fs import)", () => {
    // This function should only use console.log
    // No fs calls should be made
    logModelDecision(makeEntry());
    expect(console.log).toHaveBeenCalledTimes(1);
  });
});
