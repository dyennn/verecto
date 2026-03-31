import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { ModelLogEntry } from "@/lib/model-logger";

// ---------------------------------------------------------------------------
// Mock Node.js `fs` module — we must not touch the real filesystem in tests.
// ---------------------------------------------------------------------------
const mockMkdirSync = vi.fn();
const mockAppendFileSync = vi.fn();

vi.mock("fs", () => ({
  default: {
    mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
    appendFileSync: (...args: unknown[]) => mockAppendFileSync(...args),
  },
  mkdirSync: (...args: unknown[]) => mockMkdirSync(...args),
  appendFileSync: (...args: unknown[]) => mockAppendFileSync(...args),
}));

// ---------------------------------------------------------------------------
// Import AFTER the mock is set up so the module picks up the mocked fs.
// ---------------------------------------------------------------------------
import { logModelDecision } from "@/lib/model-logger";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------
beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("logModelDecision — happy path", () => {
  it("calls fs.mkdirSync to ensure the logs directory exists", () => {
    logModelDecision(makeEntry());
    expect(mockMkdirSync).toHaveBeenCalledTimes(1);
  });

  it("calls fs.mkdirSync with { recursive: true }", () => {
    logModelDecision(makeEntry());
    expect(mockMkdirSync).toHaveBeenCalledWith(
      expect.any(String),
      { recursive: true }
    );
  });

  it("calls fs.appendFileSync once per invocation", () => {
    logModelDecision(makeEntry());
    expect(mockAppendFileSync).toHaveBeenCalledTimes(1);
  });

  it("writes valid JSON to the log file", () => {
    const entry = makeEntry({ model: "openai/gpt-4" });
    logModelDecision(entry);

    const [, writtenContent] = mockAppendFileSync.mock.calls[0] as [
      string,
      string,
      string,
    ];
    expect(() => JSON.parse(writtenContent.trim())).not.toThrow();
  });

  it("appended line ends with a newline character", () => {
    logModelDecision(makeEntry());
    const [, writtenContent] = mockAppendFileSync.mock.calls[0] as [
      string,
      string,
      string,
    ];
    expect(writtenContent.endsWith("\n")).toBe(true);
  });

  it("written JSON includes the model field", () => {
    const entry = makeEntry({ model: "my-model" });
    logModelDecision(entry);

    const [, writtenContent] = mockAppendFileSync.mock.calls[0] as [
      string,
      string,
      string,
    ];
    const parsed = JSON.parse(writtenContent.trim());
    expect(parsed.model).toBe("my-model");
  });

  it("written JSON includes the timestamp field", () => {
    const entry = makeEntry({ timestamp: "2026-06-15T10:00:00.000Z" });
    logModelDecision(entry);

    const [, writtenContent] = mockAppendFileSync.mock.calls[0] as [
      string,
      string,
      string,
    ];
    const parsed = JSON.parse(writtenContent.trim());
    expect(parsed.timestamp).toBe("2026-06-15T10:00:00.000Z");
  });

  it("written JSON includes the book title and author", () => {
    const entry = makeEntry({ book: { title: "Dune", author: "Frank Herbert" } });
    logModelDecision(entry);

    const [, writtenContent] = mockAppendFileSync.mock.calls[0] as [
      string,
      string,
      string,
    ];
    const parsed = JSON.parse(writtenContent.trim());
    expect(parsed.book.title).toBe("Dune");
    expect(parsed.book.author).toBe("Frank Herbert");
  });

  it("written JSON includes the rawResponse when provided", () => {
    const entry = makeEntry({ rawResponse: '{"hook":"test"}' });
    logModelDecision(entry);

    const [, writtenContent] = mockAppendFileSync.mock.calls[0] as [
      string,
      string,
      string,
    ];
    const parsed = JSON.parse(writtenContent.trim());
    expect(parsed.rawResponse).toBe('{"hook":"test"}');
  });

  it("written JSON includes the error field when provided", () => {
    const entry = makeEntry({ error: "Generation failed" });
    logModelDecision(entry);

    const [, writtenContent] = mockAppendFileSync.mock.calls[0] as [
      string,
      string,
      string,
    ];
    const parsed = JSON.parse(writtenContent.trim());
    expect(parsed.error).toBe("Generation failed");
  });

  it("writes to a path ending in model-decisions.log", () => {
    logModelDecision(makeEntry());
    const [logFilePath] = mockAppendFileSync.mock.calls[0] as [string, ...unknown[]];
    expect(logFilePath.endsWith("model-decisions.log")).toBe(true);
  });

  it("uses utf8 encoding", () => {
    logModelDecision(makeEntry());
    const [, , encoding] = mockAppendFileSync.mock.calls[0] as [
      string,
      string,
      string,
    ];
    expect(encoding).toBe("utf8");
  });
});

describe("logModelDecision — error resilience", () => {
  it("does not throw when fs.mkdirSync throws", () => {
    mockMkdirSync.mockImplementationOnce(() => {
      throw new Error("Permission denied");
    });
    expect(() => logModelDecision(makeEntry())).not.toThrow();
  });

  it("does not throw when fs.appendFileSync throws", () => {
    mockAppendFileSync.mockImplementationOnce(() => {
      throw new Error("Disk full");
    });
    expect(() => logModelDecision(makeEntry())).not.toThrow();
  });

  it("does not throw for an entry with null rawResponse and null parsedDiscussion", () => {
    const entry = makeEntry({ rawResponse: null, parsedDiscussion: null });
    expect(() => logModelDecision(entry)).not.toThrow();
  });

  it("does not throw for an entry with complex parsedDiscussion object", () => {
    const entry = makeEntry({
      parsedDiscussion: {
        hook: "hook text",
        themes: [{ title: "T", insight: "I", question: "Q?" }],
      },
    });
    expect(() => logModelDecision(entry)).not.toThrow();
    expect(mockAppendFileSync).toHaveBeenCalledTimes(1);
  });

  it("does not throw when called multiple times in sequence", () => {
    expect(() => {
      logModelDecision(makeEntry({ model: "model-1" }));
      logModelDecision(makeEntry({ model: "model-2" }));
      logModelDecision(makeEntry({ model: "model-3" }));
    }).not.toThrow();
    expect(mockAppendFileSync).toHaveBeenCalledTimes(3);
  });
});
