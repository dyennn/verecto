import { render, screen, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ThemeProvider, useTheme } from "@/components/ThemeProvider";

// ---------------------------------------------------------------------------
// localStorage mock
// ---------------------------------------------------------------------------
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(globalThis, "localStorage", {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Helper: consumer component for useTheme
// ---------------------------------------------------------------------------
function ThemeDisplay() {
  const { theme, mode, customAccent, setTheme, setMode, setCustomAccent } =
    useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="mode">{mode}</span>
      <span data-testid="accent">{customAccent}</span>
      <button onClick={() => setTheme("forest")}>set forest</button>
      <button onClick={() => setTheme("custom")}>set custom</button>
      <button onClick={() => setMode("light")}>set light</button>
      <button onClick={() => setMode("dark")}>set dark</button>
      <button onClick={() => setCustomAccent("#ff0000")}>set accent</button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ThemeProvider — initial state
// ---------------------------------------------------------------------------
describe("ThemeProvider — initial state", () => {
  it("renders children", async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <span>child content</span>
        </ThemeProvider>
      );
    });
    expect(screen.getByText("child content")).toBeDefined();
  });

  it("provides default theme 'midnight' when localStorage is empty", async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });
    expect(screen.getByTestId("theme").textContent).toBe("midnight");
  });

  it("provides default mode 'dark' when localStorage is empty", async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });
    expect(screen.getByTestId("mode").textContent).toBe("dark");
  });

  it("provides default accent '#c9a96e' when localStorage is empty", async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });
    expect(screen.getByTestId("accent").textContent).toBe("#c9a96e");
  });

  it("hydrates theme from localStorage on mount", async () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === "verecto-theme") return "forest";
      if (key === "verecto-theme-mode") return "dark";
      if (key === "verecto-custom-accent") return "#c9a96e";
      return null;
    });

    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    expect(screen.getByTestId("theme").textContent).toBe("forest");
  });

  it("hydrates mode from localStorage on mount", async () => {
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === "verecto-theme-mode") return "light";
      return null;
    });

    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    expect(screen.getByTestId("mode").textContent).toBe("light");
  });

  it("reads all three localStorage keys on mount", async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    expect(localStorageMock.getItem).toHaveBeenCalledWith("verecto-theme");
    expect(localStorageMock.getItem).toHaveBeenCalledWith("verecto-custom-accent");
    expect(localStorageMock.getItem).toHaveBeenCalledWith("verecto-theme-mode");
  });
});

// ---------------------------------------------------------------------------
// ThemeProvider — setTheme
// ---------------------------------------------------------------------------
describe("ThemeProvider — setTheme", () => {
  it("updates the theme value in the context", async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    await act(async () => {
      screen.getByText("set forest").click();
    });

    expect(screen.getByTestId("theme").textContent).toBe("forest");
  });

  it("persists the new theme to localStorage", async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    await act(async () => {
      screen.getByText("set forest").click();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "verecto-theme",
      "forest"
    );
  });

  it("writes theme to localStorage when setTheme is called", async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    localStorageMock.setItem.mockClear();

    await act(async () => {
      screen.getByText("set forest").click();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "verecto-theme",
      "forest"
    );
  });
});

// ---------------------------------------------------------------------------
// ThemeProvider — setMode
// ---------------------------------------------------------------------------
describe("ThemeProvider — setMode", () => {
  it("updates the mode value in context", async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    await act(async () => {
      screen.getByText("set light").click();
    });

    expect(screen.getByTestId("mode").textContent).toBe("light");
  });

  it("persists the new mode to localStorage", async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    await act(async () => {
      screen.getByText("set light").click();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "verecto-theme-mode",
      "light"
    );
  });

  it("persists mode to localStorage when setMode is called and theme is custom", async () => {
    // Set theme to custom first
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === "verecto-theme") return "custom";
      if (key === "verecto-theme-mode") return "dark";
      if (key === "verecto-custom-accent") return "#7a4fcf";
      return null;
    });

    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    localStorageMock.setItem.mockClear();

    await act(async () => {
      screen.getByText("set light").click();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "verecto-theme-mode",
      "light"
    );
  });
});

// ---------------------------------------------------------------------------
// ThemeProvider — setCustomAccent
// ---------------------------------------------------------------------------
describe("ThemeProvider — setCustomAccent", () => {
  it("updates the customAccent value in context", async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    await act(async () => {
      screen.getByText("set accent").click();
    });

    expect(screen.getByTestId("accent").textContent).toBe("#ff0000");
  });

  it("persists the new accent to localStorage", async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    await act(async () => {
      screen.getByText("set accent").click();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "verecto-custom-accent",
      "#ff0000"
    );
  });

  it("persists accent to localStorage when theme is 'custom' and accent changes", async () => {
    // Start with custom theme
    localStorageMock.getItem.mockImplementation((key: string) => {
      if (key === "verecto-theme") return "custom";
      if (key === "verecto-theme-mode") return "dark";
      if (key === "verecto-custom-accent") return "#7a4fcf";
      return null;
    });

    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    localStorageMock.setItem.mockClear();

    await act(async () => {
      screen.getByText("set accent").click();
    });

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "verecto-custom-accent",
      "#ff0000"
    );
  });

  it("does NOT write theme-mode to localStorage when only accent changes and theme is not 'custom'", async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeDisplay />
        </ThemeProvider>
      );
    });

    // Theme is midnight (default), not custom
    localStorageMock.setItem.mockClear();

    await act(async () => {
      screen.getByText("set accent").click();
    });

    // Only custom-accent key should be written, not theme-mode
    const calls = localStorageMock.setItem.mock.calls.map(
      ([key]: [string, string]) => key
    );
    expect(calls).not.toContain("verecto-theme-mode");
    expect(calls).toContain("verecto-custom-accent");
  });
});

// ---------------------------------------------------------------------------
// useTheme outside ThemeProvider
// ---------------------------------------------------------------------------
describe("useTheme — context defaults", () => {
  it("returns the default theme 'midnight' when used outside ThemeProvider", () => {
    function Outside() {
      const { theme } = useTheme();
      return <span data-testid="theme">{theme}</span>;
    }
    render(<Outside />);
    expect(screen.getByTestId("theme").textContent).toBe("midnight");
  });
});
