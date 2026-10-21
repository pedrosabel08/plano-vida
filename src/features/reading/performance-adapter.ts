import type { NormalizedGoal } from "@/domain/performance/types";
import type { WeeklyGoal, GoalSource } from "@/features/planning/types";
import type { ReadingLog, ReadingBook, AreaModule } from "./types";
import { addDays } from "@/lib/dates/weeks";
export function readingObservations(
  goal: WeeklyGoal,
  source: GoalSource,
  start: string,
  books: ReadingBook[],
  logs: ReadingLog[],
  modules: AreaModule[],
): NormalizedGoal["observations"] {
  if (
    source.kind !== "MODULE" ||
    source.module !== "READING" ||
    source.metric !== "PAGES_READ" ||
    goal.type !== "QUANTITY" ||
    goal.unit !== "páginas" ||
    !modules.some(
      (m) => m.id === source.area_module_id && m.area_id === goal.area_id,
    )
  )
    throw new Error("Fonte de leitura inconsistente.");
  if (
    !["ALL_BOOKS", "BOOK"].includes(source.scope || "") ||
    (source.scope === "BOOK" &&
      !books.some(
        (b) =>
          b.id === source.book_id && b.area_module_id === source.area_module_id,
      ))
  )
    throw new Error("Escopo de leitura inconsistente.");
  const ids = new Set(
    books
      .filter(
        (b) =>
          b.area_module_id === source.area_module_id &&
          (source.scope === "ALL_BOOKS" || b.id === source.book_id),
      )
      .map((b) => b.id),
  );
  const end = addDays(start, 7);
  const selected = logs.filter(
    (l) =>
      !l.is_deleted &&
      ids.has(l.book_id) &&
      l.read_on >= start &&
      l.read_on < end,
  );
  // Preserve canonical IDs: malformed duplicate input is rejected by engine v1, never silently summed.
  return selected.map((l) => ({
    id: l.id,
    date: l.read_on,
    value: String(l.pages),
    completed: null,
  }));
}
