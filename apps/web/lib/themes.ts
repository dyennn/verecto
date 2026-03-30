// Theme definitions and custom palette generator

export interface ThemeVariables {
  "--background": string;
  "--foreground": string;
  "--card": string;
  "--card-foreground": string;
  "--popover": string;
  "--popover-foreground": string;
  "--primary": string;
  "--primary-foreground": string;
  "--secondary": string;
  "--secondary-foreground": string;
  "--muted": string;
  "--muted-foreground": string;
  "--accent": string;
  "--accent-foreground": string;
  "--destructive": string;
  "--destructive-foreground": string;
  "--border": string;
  "--input": string;
  "--ring": string;
}

export interface ThemeDefinition {
  name: string;
  label: string;
  variables: ThemeVariables;
}

export const THEMES: Record<string, ThemeDefinition> = {
  midnight: {
    name: "midnight",
    label: "Midnight",
    variables: {
      "--background": "#0a0a0f",
      "--foreground": "#f5f0e8",
      "--card": "#12121a",
      "--card-foreground": "#f5f0e8",
      "--popover": "#12121a",
      "--popover-foreground": "#f5f0e8",
      "--primary": "#c9a96e",
      "--primary-foreground": "#0a0a0f",
      "--secondary": "#1e1e2a",
      "--secondary-foreground": "#f5f0e8",
      "--muted": "#1e1e2a",
      "--muted-foreground": "#8a8a9a",
      "--accent": "#c9a96e",
      "--accent-foreground": "#0a0a0f",
      "--destructive": "#e74c3c",
      "--destructive-foreground": "#f5f0e8",
      "--border": "#2a2a3a",
      "--input": "#2a2a3a",
      "--ring": "#c9a96e",
    },
  },
  parchment: {
    name: "parchment",
    label: "Parchment",
    variables: {
      "--background": "#faf7f2",
      "--foreground": "#1a1409",
      "--card": "#f0ebe3",
      "--card-foreground": "#1a1409",
      "--popover": "#f0ebe3",
      "--popover-foreground": "#1a1409",
      "--primary": "#8b6914",
      "--primary-foreground": "#faf7f2",
      "--secondary": "#e8e0d4",
      "--secondary-foreground": "#1a1409",
      "--muted": "#e8e0d4",
      "--muted-foreground": "#6b5d4a",
      "--accent": "#8b6914",
      "--accent-foreground": "#faf7f2",
      "--destructive": "#c0392b",
      "--destructive-foreground": "#faf7f2",
      "--border": "#d4cabb",
      "--input": "#d4cabb",
      "--ring": "#8b6914",
    },
  },
  ink: {
    name: "ink",
    label: "Ink",
    variables: {
      "--background": "#000000",
      "--foreground": "#ffffff",
      "--card": "#0a0a0a",
      "--card-foreground": "#ffffff",
      "--popover": "#0a0a0a",
      "--popover-foreground": "#ffffff",
      "--primary": "#ffffff",
      "--primary-foreground": "#000000",
      "--secondary": "#161616",
      "--secondary-foreground": "#ffffff",
      "--muted": "#161616",
      "--muted-foreground": "#888888",
      "--accent": "#ffffff",
      "--accent-foreground": "#000000",
      "--destructive": "#ff4444",
      "--destructive-foreground": "#ffffff",
      "--border": "#222222",
      "--input": "#222222",
      "--ring": "#ffffff",
    },
  },
  forest: {
    name: "forest",
    label: "Forest",
    variables: {
      "--background": "#0a120f",
      "--foreground": "#e8f0ec",
      "--card": "#111f1a",
      "--card-foreground": "#e8f0ec",
      "--popover": "#111f1a",
      "--popover-foreground": "#e8f0ec",
      "--primary": "#7da67d",
      "--primary-foreground": "#0a120f",
      "--secondary": "#1a2e25",
      "--secondary-foreground": "#e8f0ec",
      "--muted": "#1a2e25",
      "--muted-foreground": "#7a9a8a",
      "--accent": "#7da67d",
      "--accent-foreground": "#0a120f",
      "--destructive": "#c0392b",
      "--destructive-foreground": "#e8f0ec",
      "--border": "#243d32",
      "--input": "#243d32",
      "--ring": "#7da67d",
    },
  },
  rose: {
    name: "rose",
    label: "Rose",
    variables: {
      "--background": "#140f12",
      "--foreground": "#f0e8ec",
      "--card": "#1f1519",
      "--card-foreground": "#f0e8ec",
      "--popover": "#1f1519",
      "--popover-foreground": "#f0e8ec",
      "--primary": "#c97a8e",
      "--primary-foreground": "#140f12",
      "--secondary": "#2e1a23",
      "--secondary-foreground": "#f0e8ec",
      "--muted": "#2e1a23",
      "--muted-foreground": "#9a7a8a",
      "--accent": "#c97a8e",
      "--accent-foreground": "#140f12",
      "--destructive": "#e74c3c",
      "--destructive-foreground": "#f0e8ec",
      "--border": "#3d2430",
      "--input": "#3d2430",
      "--ring": "#c97a8e",
    },
  },
};

// ── Custom palette generation from a single accent color ──

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function generateCustomPalette(accentHex: string): ThemeVariables {
  const [h] = hexToHsl(accentHex);
  const isDark = luminance(accentHex) < 0.5;
  const primaryFg = isDark ? "#ffffff" : "#000000";

  return {
    "--background": hslToHex(h, 20, 4),
    "--foreground": hslToHex(h, 15, 95),
    "--card": hslToHex(h, 20, 8),
    "--card-foreground": hslToHex(h, 15, 95),
    "--popover": hslToHex(h, 20, 8),
    "--popover-foreground": hslToHex(h, 15, 95),
    "--primary": accentHex,
    "--primary-foreground": primaryFg,
    "--secondary": hslToHex(h, 15, 12),
    "--secondary-foreground": hslToHex(h, 15, 95),
    "--muted": hslToHex(h, 15, 12),
    "--muted-foreground": hslToHex(h, 10, 55),
    "--accent": accentHex,
    "--accent-foreground": primaryFg,
    "--destructive": "#e74c3c",
    "--destructive-foreground": hslToHex(h, 15, 95),
    "--border": hslToHex(h, 15, 17),
    "--input": hslToHex(h, 15, 17),
    "--ring": accentHex,
  };
}
