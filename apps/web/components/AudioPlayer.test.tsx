import { render, screen, fireEvent, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AudioPlayer } from "@/components/AudioPlayer";

// ---------------------------------------------------------------------------
// speechSynthesis mock
// ---------------------------------------------------------------------------
const mockCancel = vi.fn();
const mockSpeak = vi.fn();
const mockPause = vi.fn();
const mockResume = vi.fn();
const mockGetVoices = vi.fn(() => []);

function makeMockSpeechSynthesis(
  overrides: Partial<typeof globalThis.speechSynthesis> = {}
) {
  return {
    cancel: mockCancel,
    speak: mockSpeak,
    pause: mockPause,
    resume: mockResume,
    getVoices: mockGetVoices,
    paused: false,
    pending: false,
    speaking: false,
    onvoiceschanged: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(globalThis, "speechSynthesis", {
    value: makeMockSpeechSynthesis(),
    writable: true,
    configurable: true,
  });
  // Minimal SpeechSynthesisUtterance mock
  Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
    value: class {
      rate = 1;
      voice: unknown = null;
      onend: (() => void) | null = null;
      constructor(public text: string) {}
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function renderPlayer(
  props: { script?: string; bookTitle?: string } = {}
) {
  return render(
    <AudioPlayer
      script={props.script ?? "Hello world this is a test script."}
      bookTitle={props.bookTitle ?? "Test Book"}
    />
  );
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
describe("AudioPlayer — rendering", () => {
  it("renders the play button initially (not playing)", () => {
    renderPlayer();
    // Should show play button by default (aria or icon)
    const buttons = screen.getAllByRole("button");
    // Play button + Stop button + Speed button = at least 3
    expect(buttons.length).toBeGreaterThanOrEqual(3);
  });

  it("renders the book title in the footer", () => {
    renderPlayer({ bookTitle: "Moby-Dick" });
    expect(screen.getByText(/Moby-Dick/)).toBeDefined();
  });

  it("renders '— Verecto Discussion' in the footer", () => {
    renderPlayer({ bookTitle: "My Book" });
    expect(screen.getByText(/Verecto Discussion/)).toBeDefined();
  });

  it("renders the initial speed as '1x'", () => {
    renderPlayer();
    expect(screen.getByText("1x")).toBeDefined();
  });

  it("renders the progress bar element", () => {
    const { container } = renderPlayer();
    // Progress bar container uses overflow-hidden class
    const bar = container.querySelector(".overflow-hidden");
    expect(bar).not.toBeNull();
  });

  it("renders the unsupported message when speechSynthesis is not available", () => {
    // Remove speechSynthesis to simulate unsupported browser
    Object.defineProperty(globalThis, "speechSynthesis", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    renderPlayer();
    expect(
      screen.getByText(/Audio playback is not supported in this browser\./)
    ).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Play / Pause
// ---------------------------------------------------------------------------
describe("AudioPlayer — play and pause", () => {
  it("calls speechSynthesis.speak when play button is clicked", () => {
    renderPlayer();
    const playBtn = screen.getAllByRole("button")[0];
    fireEvent.click(playBtn);
    expect(mockSpeak).toHaveBeenCalledTimes(1);
  });

  it("calls speechSynthesis.cancel before speaking (fresh start)", () => {
    renderPlayer();
    const playBtn = screen.getAllByRole("button")[0];
    fireEvent.click(playBtn);
    expect(mockCancel).toHaveBeenCalled();
  });

  it("calls speechSynthesis.pause when clicked again while playing", () => {
    renderPlayer();
    const playBtn = screen.getAllByRole("button")[0];

    // Click to start playing
    fireEvent.click(playBtn);
    // Click again to pause
    fireEvent.click(playBtn);

    expect(mockPause).toHaveBeenCalledTimes(1);
  });

  it("calls speechSynthesis.resume when resumed from paused state", () => {
    Object.defineProperty(globalThis, "speechSynthesis", {
      value: makeMockSpeechSynthesis({ paused: true }),
      writable: true,
      configurable: true,
    });

    renderPlayer();
    const playBtn = screen.getAllByRole("button")[0];
    // Not playing, but speechSynthesis is paused → should resume
    fireEvent.click(playBtn);

    expect(mockResume).toHaveBeenCalledTimes(1);
    expect(mockSpeak).not.toHaveBeenCalled();
  });

  it("does nothing when play is clicked and speech is not supported", () => {
    Object.defineProperty(globalThis, "speechSynthesis", {
      value: undefined,
      writable: true,
      configurable: true,
    });

    renderPlayer();
    // The unsupported message is shown; the original player buttons are gone
    expect(
      screen.getByText(/Audio playback is not supported in this browser\./)
    ).toBeDefined();
    expect(mockSpeak).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Stop
// ---------------------------------------------------------------------------
describe("AudioPlayer — stop", () => {
  it("calls speechSynthesis.cancel when the stop button is clicked", () => {
    renderPlayer();
    // Stop button is the second button (index 1)
    const stopBtn = screen.getAllByRole("button")[1];
    fireEvent.click(stopBtn);
    expect(mockCancel).toHaveBeenCalled();
  });

  it("stop button can be clicked without first playing", () => {
    renderPlayer();
    const stopBtn = screen.getAllByRole("button")[1];
    expect(() => fireEvent.click(stopBtn)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Speed cycling
// ---------------------------------------------------------------------------
describe("AudioPlayer — speed", () => {
  const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

  it("cycles through speeds on repeated clicks", () => {
    renderPlayer();
    // Speed button is a <button> (not role=button from shadcn's Button)
    // We find it by text content
    const getSpeedBtn = () => screen.getByText(/x$/);

    expect(getSpeedBtn().textContent).toBe("1x");

    // Cycle through 0.75
    fireEvent.click(getSpeedBtn());
    expect(getSpeedBtn().textContent).toBe("1.25x");

    fireEvent.click(getSpeedBtn());
    expect(getSpeedBtn().textContent).toBe("1.5x");

    fireEvent.click(getSpeedBtn());
    expect(getSpeedBtn().textContent).toBe("2x");

    fireEvent.click(getSpeedBtn());
    expect(getSpeedBtn().textContent).toBe("0.75x");

    fireEvent.click(getSpeedBtn());
    expect(getSpeedBtn().textContent).toBe("1x");
  });

  it("restarts playback at new speed if currently playing when speed is changed", () => {
    renderPlayer();
    const playBtn = screen.getAllByRole("button")[0];
    fireEvent.click(playBtn); // start playing

    mockCancel.mockClear(); // clear the initial cancel from play
    mockSpeak.mockClear();

    const speedBtn = screen.getByText(/x$/);
    fireEvent.click(speedBtn); // change speed while playing

    expect(mockCancel).toHaveBeenCalled();
    expect(mockSpeak).toHaveBeenCalled();
  });

  it("does not restart playback if speed changes when not playing", () => {
    renderPlayer();
    mockSpeak.mockClear();

    const speedBtn = screen.getByText("1x");
    fireEvent.click(speedBtn);

    expect(mockSpeak).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Voice selection
// ---------------------------------------------------------------------------
describe("AudioPlayer — voice selection", () => {
  it("picks a Google English voice when available", () => {
    const voices = [
      { lang: "en-US", name: "Google US English", default: false } as SpeechSynthesisVoice,
      { lang: "fr-FR", name: "French Voice", default: false } as SpeechSynthesisVoice,
    ];
    mockGetVoices.mockReturnValue(voices);

    renderPlayer();
    const playBtn = screen.getAllByRole("button")[0];
    fireEvent.click(playBtn);

    // The utterance passed to speak should have voice set
    const utterancePassed = mockSpeak.mock.calls[0][0] as {
      voice: SpeechSynthesisVoice | null;
    };
    expect(utterancePassed.voice?.name).toBe("Google US English");
  });

  it("falls back to any English voice if no Google voice is available", () => {
    const voices = [
      { lang: "en-GB", name: "English GB", default: false } as SpeechSynthesisVoice,
      { lang: "de-DE", name: "German Voice", default: false } as SpeechSynthesisVoice,
    ];
    mockGetVoices.mockReturnValue(voices);

    renderPlayer();
    const playBtn = screen.getAllByRole("button")[0];
    fireEvent.click(playBtn);

    const utterancePassed = mockSpeak.mock.calls[0][0] as {
      voice: SpeechSynthesisVoice | null;
    };
    expect(utterancePassed.voice?.lang).toBe("en-GB");
  });

  it("falls back to the first available voice when no English voices exist", () => {
    const voices = [
      { lang: "de-DE", name: "German Voice", default: false } as SpeechSynthesisVoice,
      { lang: "fr-FR", name: "French Voice", default: false } as SpeechSynthesisVoice,
    ];
    mockGetVoices.mockReturnValue(voices);

    renderPlayer();
    const playBtn = screen.getAllByRole("button")[0];
    fireEvent.click(playBtn);

    const utterancePassed = mockSpeak.mock.calls[0][0] as {
      voice: SpeechSynthesisVoice | null;
    };
    expect(utterancePassed.voice?.name).toBe("German Voice");
  });

  it("voice is null when no voices are available", () => {
    mockGetVoices.mockReturnValue([]);

    renderPlayer();
    const playBtn = screen.getAllByRole("button")[0];
    fireEvent.click(playBtn);

    const utterancePassed = mockSpeak.mock.calls[0][0] as {
      voice: SpeechSynthesisVoice | null;
    };
    // No voice set when list is empty
    expect(utterancePassed.voice).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Cleanup
// ---------------------------------------------------------------------------
describe("AudioPlayer — cleanup", () => {
  it("cancels speech on unmount", () => {
    const { unmount } = renderPlayer();
    unmount();
    expect(mockCancel).toHaveBeenCalled();
  });
});
