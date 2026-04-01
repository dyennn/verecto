export interface ModelLogEntry {
  timestamp: string;
  model: string;
  book: { title: string; author: string };
  rawResponse: string | null;
  parsedDiscussion: unknown | null;
  error?: string;
}

/**
 * Logs model decisions to console for serverless environments.
 * Visible in Vercel Runtime Logs, CloudWatch, etc.
 * Does NOT write to filesystem (ephemeral in serverless).
 */
export function logModelDecision(entry: ModelLogEntry): void {
  console.log("[model-decision]", JSON.stringify(entry));
}
