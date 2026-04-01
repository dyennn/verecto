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
  // Always log to console — visible in Vercel Runtime Logs
  console.log("[model-decision]", JSON.stringify(entry));

  // Also write to file for local development
  try {
    if (!fs.existsSync(LOG_DIR)) {
      fs.mkdirSync(LOG_DIR, { recursive: true });
    }
    fs.appendFileSync(LOG_FILE, JSON.stringify(entry) + "\n", "utf8");
  } catch {
    // Silently ignore file write failures in serverless (ephemeral filesystem)
  }
}
