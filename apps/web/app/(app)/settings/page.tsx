"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/ThemeProvider";
import { THEMES, generateCustomPalette } from "@/lib/themes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Check, Palette, Sun, Moon } from "lucide-react";

const themeOrder = ["midnight", "parchment", "ink", "forest", "rose"] as const;

export function SettingsSubNav() {
  const pathname = usePathname();
  const tabs = [
    { href: "/settings", label: "Theme" },
    { href: "/settings/profile", label: "Profile" },
  ];
  return (
    <div className="flex gap-1 border-b border-[var(--border)]">
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          className={cn(
            "px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            pathname === tab.href
              ? "border-[var(--primary)] text-[var(--foreground)]"
              : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme, customAccent, setCustomAccent, mode, setMode } =
    useTheme();

  const previewVars =
    theme === "custom" ? generateCustomPalette(customAccent, mode) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <h1 className="font-[family-name:var(--font-serif)] text-3xl font-bold">
        Settings
      </h1>

      <SettingsSubNav />

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

          {/* Custom Accent Picker + Mode Toggle */}
          {theme === "custom" && (
            <div className="space-y-4 rounded-lg border border-[var(--border)] bg-[var(--secondary)] p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Mode</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setMode("light")}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-all",
                      mode === "light"
                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)]"
                        : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/40"
                    )}
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </button>
                  <button
                    onClick={() => setMode("dark")}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-all",
                      mode === "dark"
                        ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--foreground)]"
                        : "border-[var(--border)] text-[var(--muted-foreground)] hover:border-[var(--primary)]/40"
                    )}
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </button>
                </div>
              </div>

              <div className="space-y-2">
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

              {previewVars && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Preview</p>
                  <div
                    className="rounded-lg border p-4"
                    style={{
                      backgroundColor: previewVars["--background"],
                      borderColor: previewVars["--border"],
                    }}
                  >
                    <div className="space-y-3">
                      <div className="flex gap-2">
                        {(["--background", "--card", "--primary", "--secondary"] as const).map((key) => (
                          <div key={key} className="flex flex-col items-center gap-1">
                            <div
                              className="h-8 w-8 rounded-md border"
                              style={{
                                backgroundColor: previewVars[key],
                                borderColor: previewVars["--border"],
                              }}
                            />
                            <span
                              className="text-[10px]"
                              style={{ color: previewVars["--muted-foreground"] }}
                            >
                              {key.replace("--", "")}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div
                        className="rounded-md p-3"
                        style={{ backgroundColor: previewVars["--card"] }}
                      >
                        <p
                          className="text-sm font-medium"
                          style={{ color: previewVars["--card-foreground"] }}
                        >
                          Sample heading
                        </p>
                        <p
                          className="mt-1 text-xs"
                          style={{ color: previewVars["--muted-foreground"] }}
                        >
                          This is how body text will look with your palette.
                        </p>
                        <button
                          className="mt-2 rounded-md px-3 py-1.5 text-xs font-medium"
                          style={{
                            backgroundColor: previewVars["--primary"],
                            color: previewVars["--primary-foreground"],
                          }}
                        >
                          Primary Button
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
