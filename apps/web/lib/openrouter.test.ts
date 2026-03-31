import { generateDiscussion, MODELS, type Book, type UserProfile } from "./openrouter";
import * as modelLogger from "./model-logger";

vi.mock("./model-logger", () => ({
  logModelDecision: vi.fn(),
}));

const mockSend = vi.fn();

vi.mock("@openrouter/sdk", () => {
  class MockOpenRouter {
    chat = { send: mockSend };
    constructor() {}
  }
  return { OpenRouter: MockOpenRouter };
});

const mockBook: Book = {
  title: "The Great Gatsby",
  author: "F. Scott Fitzgerald",
  genre: "Fiction",
  synopsis: "A story about the American Dream.",
  progress: "Finished.",
};

const mockProfile: UserProfile = {
  topMoods: ["loved_it"],
  favoriteGenres: ["Fiction"],
  pastBooks: [
    { title: "1984", author: "George Orwell", mood: "loved_it" },
  ],
};

const mockDiscussionResponse = {
  hook: "What makes a dream worth chasing?",
  themes: [
    {
      title: "The American Dream",
      insight: "The novel explores the corruption of the American Dream.",
      question: "What is your American Dream?",
    },
  ],
  character_spotlight: {
    character: "Gatsby",
    analysis: "Gatsby is a complex character driven by obsession.",
    question: "Would you do the same for love?",
  },
  connection_to_reader: "This connects to your love of complex narratives.",
  closing_provocation: "Maybe the dream was never the point.",
};

describe("generateDiscussion — OpenRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns success with discussion when API call succeeds", async () => {
    mockSend.mockResolvedValue({
      model: "test-model",
      choices: [{ message: { content: JSON.stringify(mockDiscussionResponse) } }],
    });

    const result = await generateDiscussion(
      mockBook,
      mockProfile,
      "test-api-key",
      MODELS.free
    );

    expect(result.success).toBe(true);
    expect(result.discussion).toEqual(mockDiscussionResponse);
    expect(result.error).toBeUndefined();
  });

  it("returns error when API call fails", async () => {
    mockSend.mockRejectedValue(new Error("Network error"));

    const result = await generateDiscussion(
      mockBook,
      mockProfile,
      "test-api-key",
      MODELS.free
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Could not generate discussion. Please try again.");
    expect(result.discussion).toBeUndefined();
  });

  it("returns error when JSON parsing fails", async () => {
    mockSend.mockResolvedValue({
      model: "test-model",
      choices: [{ message: { content: "invalid json" } }],
    });

    const result = await generateDiscussion(
      mockBook,
      mockProfile,
      "test-api-key",
      MODELS.free
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe("Could not generate discussion. Please try again.");
  });

  it("uses default model when not specified", async () => {
    mockSend.mockResolvedValue({
      model: "test-model",
      choices: [{ message: { content: JSON.stringify(mockDiscussionResponse) } }],
    });

    await generateDiscussion(mockBook, mockProfile, "test-api-key");

    expect(mockSend).toHaveBeenCalled();
  });

  it("logs model decision on success", async () => {
    mockSend.mockResolvedValue({
      model: "test-model",
      choices: [{ message: { content: JSON.stringify(mockDiscussionResponse) } }],
    });

    await generateDiscussion(mockBook, mockProfile, "test-api-key");

    expect(modelLogger.logModelDecision).toHaveBeenCalled();
  });

  it("logs model decision on failure", async () => {
    mockSend.mockRejectedValue(new Error("Network error"));

    await generateDiscussion(mockBook, mockProfile, "test-api-key");

    expect(modelLogger.logModelDecision).toHaveBeenCalled();
  });
});

describe("MODELS", () => {
  it("exports expected model keys", () => {
    expect(MODELS.free).toBeDefined();
    expect(MODELS.budget).toBeDefined();
    expect(MODELS.fast).toBeDefined();
    expect(MODELS.premium).toBeDefined();
  });

  it("free model has :free suffix", () => {
    expect(MODELS.free).toMatch(/:free$/);
  });
});

describe("buildUserPrompt — content", () => {
  it("includes book title and author in the prompt", async () => {
    let capturedBody: any;
    mockSend.mockImplementation((args: any) => {
      capturedBody = args;
      return Promise.resolve({
        model: "test",
        choices: [{ message: { content: JSON.stringify(mockDiscussionResponse) } }],
      });
    });

    await generateDiscussion(mockBook, mockProfile, "key");

    const userPrompt = capturedBody.chatGenerationParams.messages[1].content;
    expect(userPrompt).toContain("The Great Gatsby");
    expect(userPrompt).toContain("F. Scott Fitzgerald");
  });

  it("includes past books in the prompt", async () => {
    let capturedBody: any;
    mockSend.mockImplementation((args: any) => {
      capturedBody = args;
      return Promise.resolve({
        model: "test",
        choices: [{ message: { content: JSON.stringify(mockDiscussionResponse) } }],
      });
    });

    await generateDiscussion(mockBook, mockProfile, "key");

    const userPrompt = capturedBody.chatGenerationParams.messages[1].content;
    expect(userPrompt).toContain("1984");
    expect(userPrompt).toContain("George Orwell");
  });

  it("handles empty profile gracefully", async () => {
    mockSend.mockResolvedValue({
      model: "test",
      choices: [{ message: { content: JSON.stringify(mockDiscussionResponse) } }],
    });

    const emptyProfile: UserProfile = {};
    const result = await generateDiscussion(mockBook, emptyProfile, "key");
    expect(result.success).toBe(true);
  });
});
