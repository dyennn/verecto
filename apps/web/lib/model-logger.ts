import fs from "fs";
import path from "path";

const LOG_DIR = path.join(process.cwd(), "logs");
const LOG_FILE = path.join(LOG_DIR, "model-decisions.log");

export interface ModelLogEntry {
  timestamp: string;
  model: string;
  book: { title: string; author: string };
  rawResponse: string | null;
  parsedDiscussion: unknown | null;
  error?: string;
}

export function logModelDecision(entry: ModelLogEntry): void {
  try {
    fs.mkdirSync(LOG_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n", "utf8");
  } catch (err) {
    // Logging must never crash the app
    console.error("Failed to write model log:", err);
  }
}
