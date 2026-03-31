import type { DiscussionGuide } from "./openrouter";

export function discussionToScript(
  discussion: DiscussionGuide,
  bookTitle: string
): string {
  const lines: string[] = [];

  lines.push(`${bookTitle}. A Verecto discussion.`);
  lines.push("");
  lines.push(discussion.hook);
  lines.push("");

  discussion.themes.forEach((theme, i) => {
    lines.push(
      `Theme ${i + 1}: ${theme.title}. ${theme.insight} ${theme.question}`
    );
    lines.push("");
  });

  lines.push(
    `Character spotlight: ${discussion.character_spotlight.character}. ${discussion.character_spotlight.analysis} ${discussion.character_spotlight.question}`
  );
  lines.push("");

  lines.push(`A note just for you: ${discussion.connection_to_reader}`);
  lines.push("");

  lines.push(`And finally: ${discussion.closing_provocation}`);

  return lines.join("\n");
}
