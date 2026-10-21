import "server-only";
import { OpenLibraryProvider } from "@/services/book-catalog/open-library";
import type { CatalogBook } from "@/services/book-catalog/provider";
const provider = new OpenLibraryProvider(
  fetch,
  process.env.BOOK_CATALOG_CONTACT || "",
);
const cache = new Map<string, { expires: number; data: CatalogBook[] }>();
let queue = Promise.resolve();
let next = 0;
export async function searchCatalog(query: string) {
  const key = query.toLocaleLowerCase("pt-BR");
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.data;
  const result = queue.then(async () => {
    const cached = cache.get(key);
    if (cached && cached.expires > Date.now()) return cached.data;
    const delay = Math.max(0, next - Date.now());
    if (delay) await new Promise((r) => setTimeout(r, delay));
    next = Date.now() + 1100;
    const data = await provider.search(query);
    if (cache.size >= 100) cache.delete(cache.keys().next().value!);
    cache.set(key, { expires: Date.now() + 3600000, data });
    return data;
  });
  queue = result.then(
    () => {},
    () => {},
  );
  return result;
}
