const BASE_URL = "https://openlibrary.org";

export interface BookSearchResult {
  ol_key: string;
  title: string;
  author: string;
  cover_url: string | null;
  genre: string | null;
  synopsis: string | null;
  first_publish_year: number | null;
}

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  const url = `${BASE_URL}/search.json?q=${encodeURIComponent(query)}&limit=10&fields=key,title,author_name,cover_i,subject,first_publish_year`;
  const res = await fetch(url);
  const data = await res.json();

  return (data.docs || []).map((doc: Record<string, unknown>) => ({
    ol_key: doc.key as string,
    title: doc.title as string,
    author: (doc.author_name as string[])?.[0] || "Unknown Author",
    cover_url: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
      : null,
    genre: (doc.subject as string[])?.[0] || null,
    synopsis: null,
    first_publish_year: (doc.first_publish_year as number) || null,
  }));
}

export async function getBookDetails(
  olKey: string
): Promise<Partial<BookSearchResult>> {
  const url = `${BASE_URL}${olKey}.json`;
  const res = await fetch(url);
  const data = await res.json();

  const synopsis =
    typeof data.description === "string"
      ? data.description
      : data.description?.value || null;

  return { synopsis };
}
