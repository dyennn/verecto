"use client";

import { useRef, useState } from "react";
import { parseGoodreadsCsv, mapGoodreadsToVerecto, type MappedBook } from "@/lib/csv-parse";
import type { BookRow } from "@/hooks/useBooks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { Upload, X, FileText } from "lucide-react";

type Step = "idle" | "preview" | "importing" | "done";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: number;
}

interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  existingBooks: BookRow[];
  onImport: (
    books: MappedBook[],
    onProgress: (done: number, total: number) => void
  ) => Promise<ImportResult>;
}

export function ImportModal({
  open,
  onClose,
  existingBooks,
  onImport,
}: ImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("idle");
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed] = useState<MappedBook[]>([]);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [result, setResult] = useState<ImportResult | null>(null);
  const { toast } = useToast();

  if (!open) return null;

  // Count duplicates against existing library
  const existingKeys = new Set(
    existingBooks.map(
      (b) =>
        `${b.title.toLowerCase().trim()}|||${(b.author ?? "").toLowerCase().trim()}`
    )
  );
  const duplicates = parsed.filter((b) =>
    existingKeys.has(
      `${b.title.toLowerCase().trim()}|||${(b.author ?? "").toLowerCase().trim()}`
    )
  ).length;
  const toImport = parsed.length - duplicates;

  // Status counts
  const finished = parsed.filter((b) => b.status === "finished").length;
  const reading = parsed.filter((b) => b.status === "reading").length;
  const wantToRead = parsed.filter((b) => b.status === "want_to_read").length;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      try {
        const goodreadsBooks = parseGoodreadsCsv(text);
        if (goodreadsBooks.length === 0) {
          toast({
            title: "No books found",
            description: "Make sure you're uploading a valid Goodreads export CSV.",
            variant: "destructive",
          });
          return;
        }
        const mapped = mapGoodreadsToVerecto(goodreadsBooks);
        setParsed(mapped);
        setStep("preview");
      } catch {
        toast({
          title: "Parse error",
          description: "Could not read the CSV file. Please try again.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    setProgress({ done: 0, total: toImport });
    setStep("importing");

    const res = await onImport(parsed, (done, total) => {
      setProgress({ done, total });
    });

    setResult(res);
    setStep("done");
  }

  function handleClose() {
    // Reset state for next use
    setStep("idle");
    setFileName("");
    setParsed([]);
    setProgress({ done: 0, total: 0 });
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="flex flex-row items-start justify-between">
          <CardTitle className="font-[family-name:var(--font-serif)] text-2xl">
            Import from Goodreads
          </CardTitle>
          {step !== "importing" && (
            <button
              onClick={handleClose}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {/* ── idle: file upload ── */}
          {step === "idle" && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                Export your library from Goodreads (My Books → Import/Export →
                Export Library) then upload the CSV file here.
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed border-[var(--border)] p-8 transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--secondary)]"
              >
                <Upload className="h-8 w-8 text-[var(--muted-foreground)]" />
                <span className="text-sm text-[var(--muted-foreground)]">
                  Click to select your{" "}
                  <span className="font-medium text-[var(--foreground)]">
                    goodreads_library_export.csv
                  </span>
                </span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}

          {/* ── preview: summary before import ── */}
          {step === "preview" && (
            <div className="space-y-5">
              <div className="flex items-center gap-3 rounded-lg bg-[var(--secondary)] p-3">
                <FileText className="h-5 w-5 shrink-0 text-[var(--primary)]" />
                <span className="truncate text-sm font-medium">{fileName}</span>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Books found ({parsed.length})</p>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-lg bg-[var(--secondary)] p-3">
                    <p className="text-xl font-bold">{finished}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Finished</p>
                  </div>
                  <div className="rounded-lg bg-[var(--secondary)] p-3">
                    <p className="text-xl font-bold">{reading}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Reading</p>
                  </div>
                  <div className="rounded-lg bg-[var(--secondary)] p-3">
                    <p className="text-xl font-bold">{wantToRead}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">Want to Read</p>
                  </div>
                </div>
              </div>

              {duplicates > 0 && (
                <p className="text-sm text-[var(--muted-foreground)]">
                  <span className="font-medium text-[var(--foreground)]">
                    {duplicates}
                  </span>{" "}
                  duplicate{duplicates !== 1 ? "s" : ""} already in your library
                  will be skipped.
                </p>
              )}

              <p className="text-sm">
                Ready to import{" "}
                <span className="font-bold text-[var(--primary)]">{toImport}</span>{" "}
                book{toImport !== 1 ? "s" : ""}.
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={handleImport}
                  disabled={toImport === 0}
                  className="flex-1"
                >
                  Import {toImport} book{toImport !== 1 ? "s" : ""}
                </Button>
                <Button variant="outline" onClick={handleClose}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* ── importing: progress bar ── */}
          {step === "importing" && (
            <div className="space-y-4">
              <p className="text-sm text-[var(--muted-foreground)]">
                Importing your books — please don&apos;t close this window…
              </p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span className="text-[var(--muted-foreground)]">
                    {progress.done} / {progress.total}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--secondary)]">
                  <div
                    className="h-full bg-[var(--primary)] transition-all duration-300"
                    style={{
                      width: progress.total > 0
                        ? `${(progress.done / progress.total) * 100}%`
                        : "0%",
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── done: results ── */}
          {step === "done" && result && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-2 text-center text-sm">
                <div className="rounded-lg bg-[var(--secondary)] p-3">
                  <p className="text-xl font-bold text-[var(--primary)]">
                    {result.imported}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">Imported</p>
                </div>
                <div className="rounded-lg bg-[var(--secondary)] p-3">
                  <p className="text-xl font-bold">{result.skipped}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Skipped</p>
                </div>
                <div className="rounded-lg bg-[var(--secondary)] p-3">
                  <p className="text-xl font-bold">{result.errors}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Errors</p>
                </div>
              </div>

              {result.imported > 0 && (
                <p className="text-sm text-[var(--muted-foreground)]">
                  Your books are now in your library. Covers and synopses can be
                  added by searching each book via Open Library.
                </p>
              )}

              <Button className="w-full" onClick={handleClose}>
                Done
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
