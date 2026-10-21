export type CatalogBook = {
  provider: "OPEN_LIBRARY";
  externalId: string;
  lookedUpAt: string;
  title: string;
  authors: string[];
  pageCount: number | null;
  coverUrl: string | null;
  isbn10: string | null;
  isbn13: string | null;
};
export interface BookCatalogProvider {
  search(query: string): Promise<CatalogBook[]>;
}
export function normalizeIsbn(value: string) {
  return value.replace(/[\s-]/g, "").toUpperCase();
}
export class CatalogUnavailable extends Error {
  constructor() {
    super(
      "A busca de livros está indisponível. Você pode adicionar manualmente.",
    );
  }
}
