import { THEMES, generateCustomPalette } from "@/lib/themes";
import type { ThemeVariables } from "@/lib/themes";

// ── Helpers ────────────────────────────────────────────────────────────────

function isValidHex(str: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(str);
}

const THEME_VARIABLE_KEYS: Array<keyof ThemeVariables> = [
  "--background",
  "--foreground",
  "--card",
  "--card-foreground",
  "--popover",
  "--popover-foreground",
  "--primary",
  "--primary-foreground",
  "--secondary",
  "--secondary-foreground",
  "--muted",
  "--muted-foreground",
  "--accent",
  "--accent-foreground",
  "--destructive",
  "--destructive-foreground",
  "--border",
  "--input",
  "--ring",
];

/**
 * Relative luminance per WCAG 2.x (simple, linear approximation matching
 * the implementation in themes.ts which does NOT apply gamma correction).
 */
function luminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

// ── THEMES object ──────────────────────────────────────────────────────────

describe("THEMES", () => {
  it("contains all 5 expected preset themes", () => {
    const keys = Object.keys(THEMES);
    expect(keys).toHaveLength(5);
    expect(keys).toContain("midnight");
    expect(keys).toContain("parchment");
    expect(keys).toContain("ink");
    expect(keys).toContain("forest");
    expect(keys).toContain("rose");
  });

  describe.each(["midnight", "parchment", "ink", "forest", "rose"])(
    "theme: %s",
    (themeKey) => {
      it("has a non-empty name matching its key", () => {
        expect(THEMES[themeKey].name).toBe(themeKey);
      });

      it("has a non-empty label string", () => {
        expect(typeof THEMES[themeKey].label).toBe("string");
        expect(THEMES[themeKey].label.length).toBeGreaterThan(0);
      });

      it("has a variables object containing all required CSS variable keys", () => {
        const { variables } = THEMES[themeKey];
        for (const key of THEME_VARIABLE_KEYS) {
          expect(variables).toHaveProperty(key);
        }
      });

      it("has no extra CSS variable keys beyond the required set", () => {
        const { variables } = THEMES[themeKey];
        const actualKeys = Object.keys(variables);
        expect(actualKeys).toHaveLength(THEME_VARIABLE_KEYS.length);
      });

      it("has valid hex color values for every variable", () => {
        const { variables } = THEMES[themeKey];
        for (const key of THEME_VARIABLE_KEYS) {
          expect(
            isValidHex(variables[key]),
            `${key} = "${variables[key]}" is not a valid 6-digit hex color`
          ).toBe(true);
        }
      });
    }
  );
});

// ── generateCustomPalette — dark mode ─────────────────────────────────────

describe("generateCustomPalette — dark mode", () => {
  const MEDIUM_ACCENT = "#7a4fcf"; // mid-range purple, luminance < 0.4
  let palette: ThemeVariables;

  beforeEach(() => {
    palette = generateCustomPalette(MEDIUM_ACCENT, "dark");
  });

  it("returns an object with all required ThemeVariables keys", () => {
    for (const key of THEME_VARIABLE_KEYS) {
      expect(palette).toHaveProperty(key);
    }
  });

  it("has no extra keys beyond the required set", () => {
    expect(Object.keys(palette)).toHaveLength(THEME_VARIABLE_KEYS.length);
  });

  it("sets --primary equal to the input accentHex", () => {
    expect(palette["--primary"]).toBe(MEDIUM_ACCENT);
  });

  it("sets --accent equal to the input accentHex", () => {
    expect(palette["--accent"]).toBe(MEDIUM_ACCENT);
  });

  it("sets --ring equal to the input accentHex", () => {
    expect(palette["--ring"]).toBe(MEDIUM_ACCENT);
  });

  it("produces valid hex colors for every value", () => {
    for (const key of THEME_VARIABLE_KEYS) {
      expect(
        isValidHex(palette[key]),
        `${key} = "${palette[key]}" is not a valid hex color`
      ).toBe(true);
    }
  });

  it("has a very dark --background (luminance < 0.05)", () => {
    expect(luminance(palette["--background"])).toBeLessThan(0.05);
  });

  it("has a very light --foreground (luminance > 0.7)", () => {
    expect(luminance(palette["--foreground"])).toBeGreaterThan(0.7);
  });

  it("sets --destructive to #e74c3c regardless of accent color", () => {
    expect(palette["--destructive"]).toBe("#e74c3c");
  });

  describe("--primary-foreground contrast selection", () => {
    it("is #000000 when accent luminance > 0.4 (light accent #ffff00)", () => {
      const result = generateCustomPalette("#ffff00", "dark");
      expect(result["--primary-foreground"]).toBe("#000000");
    });

    it("is #ffffff when accent luminance <= 0.4 (dark accent #1a1a8a)", () => {
      const result = generateCustomPalette("#1a1a8a", "dark");
      expect(result["--primary-foreground"]).toBe("#ffffff");
    });

    it("is #000000 for pure white #ffffff (luminance = 1.0)", () => {
      const result = generateCustomPalette("#ffffff", "dark");
      expect(result["--primary-foreground"]).toBe("#000000");
    });

    it("is #ffffff for pure black #000000 (luminance = 0.0)", () => {
      const result = generateCustomPalette("#000000", "dark");
      expect(result["--primary-foreground"]).toBe("#ffffff");
    });
  });

  describe("dark mode with pure white #ffffff", () => {
    let whitePalette: ThemeVariables;

    beforeEach(() => {
      whitePalette = generateCustomPalette("#ffffff", "dark");
    });

    it("all values are valid hex colors", () => {
      for (const key of THEME_VARIABLE_KEYS) {
        expect(isValidHex(whitePalette[key])).toBe(true);
      }
    });

    it("--primary equals #ffffff", () => {
      expect(whitePalette["--primary"]).toBe("#ffffff");
    });

    it("--ring equals #ffffff", () => {
      expect(whitePalette["--ring"]).toBe("#ffffff");
    });
  });

  describe("dark mode with pure black #000000", () => {
    let blackPalette: ThemeVariables;

    beforeEach(() => {
      blackPalette = generateCustomPalette("#000000", "dark");
    });

    it("all values are valid hex colors", () => {
      for (const key of THEME_VARIABLE_KEYS) {
        expect(isValidHex(blackPalette[key])).toBe(true);
      }
    });

    it("--primary equals #000000", () => {
      expect(blackPalette["--primary"]).toBe("#000000");
    });
  });

  describe("dark mode with highly saturated #ff0000", () => {
    let redPalette: ThemeVariables;

    beforeEach(() => {
      redPalette = generateCustomPalette("#ff0000", "dark");
    });

    it("all values are valid hex colors", () => {
      for (const key of THEME_VARIABLE_KEYS) {
        expect(isValidHex(redPalette[key])).toBe(true);
      }
    });

    it("--primary equals #ff0000", () => {
      expect(redPalette["--primary"]).toBe("#ff0000");
    });

    it("--background is very dark (luminance < 0.05)", () => {
      expect(luminance(redPalette["--background"])).toBeLessThan(0.05);
    });
  });

  describe("dark mode with low-saturation grey #808080", () => {
    let greyPalette: ThemeVariables;

    beforeEach(() => {
      greyPalette = generateCustomPalette("#808080", "dark");
    });

    it("all values are valid hex colors", () => {
      for (const key of THEME_VARIABLE_KEYS) {
        expect(isValidHex(greyPalette[key])).toBe(true);
      }
    });

    it("--primary equals #808080", () => {
      expect(greyPalette["--primary"]).toBe("#808080");
    });
  });
});

// ── generateCustomPalette — light mode ────────────────────────────────────

describe("generateCustomPalette — light mode", () => {
  it("has a very light --background (luminance > 0.85)", () => {
    const palette = generateCustomPalette("#7a4fcf", "light");
    expect(luminance(palette["--background"])).toBeGreaterThan(0.85);
  });

  it("has a very dark --foreground (luminance < 0.1)", () => {
    const palette = generateCustomPalette("#7a4fcf", "light");
    expect(luminance(palette["--foreground"])).toBeLessThan(0.1);
  });

  it("sets --destructive to #c0392b", () => {
    const palette = generateCustomPalette("#7a4fcf", "light");
    expect(palette["--destructive"]).toBe("#c0392b");
  });

  it("sets --destructive-foreground to #ffffff", () => {
    const palette = generateCustomPalette("#7a4fcf", "light");
    expect(palette["--destructive-foreground"]).toBe("#ffffff");
  });

  it("returns valid hex colors for every value", () => {
    const palette = generateCustomPalette("#7a4fcf", "light");
    for (const key of THEME_VARIABLE_KEYS) {
      expect(
        isValidHex(palette[key]),
        `${key} = "${palette[key]}" is not a valid hex color`
      ).toBe(true);
    }
  });

  it("returns an object with all required ThemeVariables keys", () => {
    const palette = generateCustomPalette("#7a4fcf", "light");
    for (const key of THEME_VARIABLE_KEYS) {
      expect(palette).toHaveProperty(key);
    }
  });

  describe("light accent darkening (#ffff00)", () => {
    let palette: ThemeVariables;

    beforeEach(() => {
      palette = generateCustomPalette("#ffff00", "light");
    });

    it("--primary differs from the raw input when accent is too bright", () => {
      // luminance(#ffff00) ≈ 0.928 > 0.4, so the implementation darkens it
      expect(palette["--primary"]).not.toBe("#ffff00");
    });

    it("--accent equals --primary (not the raw input)", () => {
      expect(palette["--accent"]).toBe(palette["--primary"]);
    });

    it("--ring equals --primary", () => {
      expect(palette["--ring"]).toBe(palette["--primary"]);
    });

    it("all values are valid hex colors", () => {
      for (const key of THEME_VARIABLE_KEYS) {
        expect(isValidHex(palette[key])).toBe(true);
      }
    });
  });

  describe("dark accent stays as-is (#1a1a8a)", () => {
    let palette: ThemeVariables;

    beforeEach(() => {
      palette = generateCustomPalette("#1a1a8a", "light");
    });

    it("--primary equals the input accent (luminance <= 0.4, no darkening)", () => {
      // luminance(#1a1a8a) ≈ 0.027 <= 0.4, so primary = accentHex unchanged
      expect(palette["--primary"]).toBe("#1a1a8a");
    });

    it("--accent equals --primary", () => {
      expect(palette["--accent"]).toBe(palette["--primary"]);
    });

    it("--ring equals --primary", () => {
      expect(palette["--ring"]).toBe(palette["--primary"]);
    });

    it("--primary-foreground is #ffffff (dark primary needs light foreground)", () => {
      // luminance(#1a1a8a) ≈ 0.027 <= 0.4 → primaryFg = "#ffffff"
      expect(palette["--primary-foreground"]).toBe("#ffffff");
    });

    it("all values are valid hex colors", () => {
      for (const key of THEME_VARIABLE_KEYS) {
        expect(isValidHex(palette[key])).toBe(true);
      }
    });
  });

  describe("light mode with pure white #ffffff", () => {
    it("all values are valid hex colors", () => {
      const palette = generateCustomPalette("#ffffff", "light");
      for (const key of THEME_VARIABLE_KEYS) {
        expect(isValidHex(palette[key])).toBe(true);
      }
    });

    it("--background is very light", () => {
      const palette = generateCustomPalette("#ffffff", "light");
      expect(luminance(palette["--background"])).toBeGreaterThan(0.85);
    });
  });

  describe("light mode with pure black #000000", () => {
    it("all values are valid hex colors", () => {
      const palette = generateCustomPalette("#000000", "light");
      for (const key of THEME_VARIABLE_KEYS) {
        expect(isValidHex(palette[key])).toBe(true);
      }
    });
  });

  describe("light mode with highly saturated #ff0000", () => {
    it("all values are valid hex colors", () => {
      const palette = generateCustomPalette("#ff0000", "light");
      for (const key of THEME_VARIABLE_KEYS) {
        expect(isValidHex(palette[key])).toBe(true);
      }
    });

    it("--background is very light (luminance > 0.85)", () => {
      const palette = generateCustomPalette("#ff0000", "light");
      expect(luminance(palette["--background"])).toBeGreaterThan(0.85);
    });
  });

  describe("light mode with low-saturation grey #808080", () => {
    it("all values are valid hex colors", () => {
      const palette = generateCustomPalette("#808080", "light");
      for (const key of THEME_VARIABLE_KEYS) {
        expect(isValidHex(palette[key])).toBe(true);
      }
    });
  });
});

// ── generateCustomPalette — default mode parameter ────────────────────────

describe("generateCustomPalette — default mode (dark)", () => {
  it("defaults to dark mode when mode argument is omitted", () => {
    const withDefault = generateCustomPalette("#7a4fcf");
    const withExplicit = generateCustomPalette("#7a4fcf", "dark");
    expect(withDefault).toEqual(withExplicit);
  });
});

// ── hexToHsl branch coverage: green-dominant accent colors ────────────────
// These colors have green as the dominant channel (max === g branch in hexToHsl).
// Covered colours:
//   #00cc00 — pure bright green, g is clearly max
//   #34c94a — muted green, g > r > b
//   #4caf50 — Material Design green, g > r > b

describe("generateCustomPalette — green-dominant accent colors (hexToHsl max===g branch)", () => {
  it("produces valid hex colors for pure green #00cc00 in dark mode", () => {
    const palette = generateCustomPalette("#00cc00", "dark");
    for (const key of THEME_VARIABLE_KEYS) {
      expect(
        isValidHex(palette[key]),
        `${key} = "${palette[key]}" is not a valid hex`
      ).toBe(true);
    }
  });

  it("sets --primary to the input for pure green #00cc00 in dark mode", () => {
    const palette = generateCustomPalette("#00cc00", "dark");
    expect(palette["--primary"]).toBe("#00cc00");
  });

  it("produces valid hex colors for muted green #34c94a in dark mode", () => {
    const palette = generateCustomPalette("#34c94a", "dark");
    for (const key of THEME_VARIABLE_KEYS) {
      expect(isValidHex(palette[key])).toBe(true);
    }
  });

  it("produces valid hex colors for Material green #4caf50 in light mode", () => {
    const palette = generateCustomPalette("#4caf50", "light");
    for (const key of THEME_VARIABLE_KEYS) {
      expect(isValidHex(palette[key])).toBe(true);
    }
  });

  it("has a dark background for pure green #00cc00 in dark mode", () => {
    const palette = generateCustomPalette("#00cc00", "dark");
    expect(luminance(palette["--background"])).toBeLessThan(0.05);
  });

  it("has a light background for Material green #4caf50 in light mode", () => {
    const palette = generateCustomPalette("#4caf50", "light");
    expect(luminance(palette["--background"])).toBeGreaterThan(0.85);
  });
});

// ── isValidHex helper self-test ────────────────────────────────────────────

describe("isValidHex helper", () => {
  it("accepts a valid lowercase 6-digit hex", () => {
    expect(isValidHex("#aabbcc")).toBe(true);
  });

  it("accepts a valid uppercase 6-digit hex", () => {
    expect(isValidHex("#AABBCC")).toBe(true);
  });

  it("accepts #000000 and #ffffff", () => {
    expect(isValidHex("#000000")).toBe(true);
    expect(isValidHex("#ffffff")).toBe(true);
  });

  it("rejects a 3-digit shorthand hex", () => {
    expect(isValidHex("#abc")).toBe(false);
  });

  it("rejects a hex without leading #", () => {
    expect(isValidHex("aabbcc")).toBe(false);
  });

  it("rejects an empty string", () => {
    expect(isValidHex("")).toBe(false);
  });

  it("rejects a non-hex string", () => {
    expect(isValidHex("not-a-color")).toBe(false);
  });
});
