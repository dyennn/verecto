"use client";

import { useTheme } from "@/components/ThemeProvider";
import { THEMES } from "@/lib/themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, Palette } from "lucide-react";

const themeOrder = ["midnight", "parchment", "ink", "forest", "rose"] as const;

export default function SettingsPage() {
  const { theme, setTheme, customAccent, setCustomAccent } = useTheme();

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl font-bold">
        Settings
      </h1>

      {/* Theme Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-[family-name:var(--font-serif)] text-xl">
            <Palette className="h-5 w-5 text-[var(--primary)]" />
            Theme
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Preset Themes */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {themeOrder.map((key) => {
              const t = THEMES[key];
              const isActive = theme === key;
              return (
                <button
                  key={key}
                  onClick={() => setTheme(key)}
                  className={cn(
                    "relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all",
                    isActive
                      ? "border-[var(--primary)] bg-[var(--primary)]/5"
                      : "border-[var(--border)] hover:border-[var(--primary)]/40"
                  )}
                >
                  {/* Preview swatch */}
                  <div
                    className="flex h-12 w-full items-center justify-center rounded-md"
                    style={{ backgroundColor: t.variables["--background"] }}
                  >
                    <div className="flex gap-1.5">
                      <div
                        className="h-5 w-5 rounded-full"
                        style={{ backgroundColor: t.variables["--primary"] }}
                      />
                      <div
                        className="h-5 w-5 rounded-full"
                        style={{ backgroundColor: t.variables["--secondary"] }}
                      />
                      <div
                        className="h-5 w-5 rounded-full"
                        style={{ backgroundColor: t.variables["--foreground"] }}
                      />
                    </div>
                  </div>
                  <span className="text-sm font-medium">{t.label}</span>
                  {isActive && (
                    <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]">
                      <Check className="h-3 w-3" />
                    </div>
                  )}
                </button>
              );
            })}

            {/* Custom Theme */}
            <button
              onClick={() => setTheme("custom")}
              className={cn(
                "relative flex flex-col items-center gap-2 rounded-lg border-2 p-4 transition-all",
                theme === "custom"
                  ? "border-[var(--primary)] bg-[var(--primary)]/5"
                  : "border-[var(--border)] hover:border-[var(--primary)]/40"
              )}
            >
              <div className="flex h-12 w-full items-center justify-center rounded-md border border-dashed border-[var(--border)]">
                <Palette className="h-6 w-6 text-[var(--muted-foreground)]" />
              </div>
              <span className="text-sm font-medium">Custom</span>
              {theme === "custom" && (
                <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]">
                  <Check className="h-3 w-3" />
                </div>
              )}
            </button>
          </div>

          {/* Custom Accent Picker */}
          {theme === "custom" && (
            <div className="space-y-3 rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-4">
              <p className="text-sm font-medium">Accent Color</p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Pick a color and the entire palette will be generated from it.
              </p>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={customAccent}
                  onChange={(e) => setCustomAccent(e.target.value)}
                  className="h-10 w-16 cursor-pointer rounded border border-[var(--border)] bg-transparent"
                />
                <span className="font-mono text-sm text-[var(--muted-foreground)]">
                  {customAccent}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
