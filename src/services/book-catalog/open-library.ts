import {
  CatalogUnavailable,
  normalizeIsbn,
  type BookCatalogProvider,
  type CatalogBook,
} from "./provider";
type Doc = {
  key?: unknown;
  title?: unknown;
  author_name?: unknown;
  number_of_pages_median?: unknown;
  cover_i?: unknown;
  isbn?: unknown;
};
export function normalizeOpenLibrary(
  doc: Doc,
  lookedUpAt: string,
): CatalogBook | null {
  if (
    typeof doc.key !== "string" ||
    !/^\/works\/OL[0-9]+W$/.test(doc.key) ||
    typeof doc.title !== "string" ||
    !doc.title.trim()
  )
    return null;
  const isbns = Array.isArray(doc.isbn)
    ? doc.isbn
        .filter((x): x is string => typeof x === "string")
        .map(normalizeIsbn)
    : [];
  const count = doc.number_of_pages_median;
  return {
    provider: "OPEN_LIBRARY",
    externalId: doc.key,
    lookedUpAt,
    title: doc.title.trim().slice(0, 200),
    authors: Array.isArray(doc.author_name)
      ? doc.author_name
          .filter((x): x is string => typeof x === "string" && !!x.trim())
          .slice(0, 20)
          .map((x) => x.trim().slice(0, 160))
      : [],
    pageCount:
      typeof count === "number" &&
      Number.isInteger(count) &&
      count > 0 &&
      count <= 2147483647
        ? count
        : null,
    coverUrl:
      typeof doc.cover_i === "number" &&
      Number.isSafeInteger(doc.cover_i) &&
      doc.cover_i > 0
        ? "https://covers.openlibrary.org/b/id/" +
          doc.cover_i +
          "-M.jpg?default=false"
        : null,
    isbn10: isbns.find((x) => /^[0-9]{9}[0-9X]$/.test(x)) || null,
    isbn13: isbns.find((x) => /^[0-9]{13}$/.test(x)) || null,
  };
}
export class OpenLibraryProvider implements BookCatalogProvider {
  constructor(
    private request: typeof fetch = fetch,
    private contact = "",
  ) {}
  async search(query: string) {
    const url = new URL("https://openlibrary.org/search.json");
    const normalized = normalizeIsbn(query);
    url.searchParams.set(
      "q",
      /^(?:[0-9]{9}[0-9X]|[0-9]{13})$/.test(normalized)
        ? "isbn:" + normalized
        : query,
    );
    url.searchParams.set(
      "fields",
      "key,title,author_name,number_of_pages_median,cover_i,isbn",
    );
    url.searchParams.set("limit", "8");
    try {
      const response = await this.request(url, {
        headers: {
          "User-Agent":
            "PlanoDeVida/1.0" + (this.contact ? " (" + this.contact + ")" : ""),
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(6000),
      });
      if (!response.ok) throw new CatalogUnavailable();
      const data = (await response.json()) as { docs?: Doc[] };
      if (!Array.isArray(data.docs)) throw new CatalogUnavailable();
      const now = new Date().toISOString();
      return data.docs
        .map((d) => normalizeOpenLibrary(d, now))
        .filter((x): x is CatalogBook => x !== null);
    } catch {
      throw new CatalogUnavailable();
    }
  }
}
