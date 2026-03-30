"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  THEMES,
  generateCustomPalette,
  type ThemeVariables,
} from "@/lib/themes";

interface ThemeContextType {
  theme: string;
  setTheme: (name: string) => void;
  customAccent: string;
  setCustomAccent: (hex: string) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: "midnight",
  setTheme: () => {},
  customAccent: "#c9a96e",
  setCustomAccent: () => {},
});

export function useTheme() {
  return useContext(ThemeContext);
}

function applyVariables(variables: ThemeVariables) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(variables)) {
    root.style.setProperty(key, value);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState("midnight");
  const [customAccent, setCustomAccentState] = useState("#c9a96e");
  const [mounted, setMounted] = useState(false);

  // Apply a theme's CSS variables
  const applyTheme = useCallback(
    (name: string, accent: string) => {
      if (typeof window === "undefined") return;

      if (name === "custom") {
        applyVariables(generateCustomPalette(accent));
      } else if (THEMES[name]) {
        applyVariables(THEMES[name].variables);
      }
    },
    []
  );

  // On mount: hydrate from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("verecto-theme") || "midnight";
    const storedAccent = localStorage.getItem("verecto-custom-accent") || "#c9a96e";

    setThemeState(stored);
    setCustomAccentState(storedAccent);
    applyTheme(stored, storedAccent);
    setMounted(true);
  }, [applyTheme]);

  const setTheme = useCallback(
    (name: string) => {
      setThemeState(name);
      localStorage.setItem("verecto-theme", name);
      applyTheme(name, customAccent);
    },
    [applyTheme, customAccent]
  );

  const setCustomAccent = useCallback(
    (hex: string) => {
      setCustomAccentState(hex);
      localStorage.setItem("verecto-custom-accent", hex);
      if (theme === "custom") {
        applyTheme("custom", hex);
      }
    },
    [applyTheme, theme]
  );

  // Prevent flash of default theme before hydration
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, customAccent, setCustomAccent }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
