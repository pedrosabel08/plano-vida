import type { GoalSource } from "@/features/planning/types";
import type { ReadingBook } from "./types";

export function isReadingSource(source?: GoalSource): boolean {
  return (
    source?.kind === "MODULE" &&
    source.module === "READING" &&
    source.metric === "PAGES_READ"
  );
}

export function booksForReadingGoal(
  source: GoalSource,
  books: ReadingBook[],
): ReadingBook[] {
  if (
    !isReadingSource(source) ||
    !source.area_module_id ||
    (source.scope !== "ALL_BOOKS" && source.scope !== "BOOK")
  )
    return [];
  return books.filter(
    (book) =>
      book.user_id === source.user_id &&
      book.area_module_id === source.area_module_id &&
      (source.scope === "ALL_BOOKS" || book.id === source.book_id),
  );
}
