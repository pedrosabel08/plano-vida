import {
  decimal,
  divide,
  multiply,
  HUNDRED,
} from "@/domain/performance/fraction";
export function bookProgress(
  initial: number,
  total: number | null,
  logs: { pages: number; is_deleted: boolean }[],
) {
  if (
    !Number.isInteger(initial) ||
    initial < 0 ||
    !Number.isSafeInteger(initial) ||
    (total !== null &&
      (!Number.isSafeInteger(total) || total <= 0 || total > 2147483647))
  )
    throw new Error("Paginação inválida.");
  const active = logs.filter((l) => !l.is_deleted);
  if (active.some((l) => !Number.isInteger(l.pages) || l.pages <= 0))
    throw new Error("Páginas inválidas.");
  const current = initial + active.reduce((s, l) => s + l.pages, 0);
  if (
    !Number.isSafeInteger(current) ||
    current > 2147483647 ||
    (total !== null && current > total)
  )
    throw new Error("A leitura ultrapassa o total de páginas.");
  return {
    current,
    percent:
      total === null
        ? null
        : multiply(divide(decimal(current), decimal(total)), HUNDRED),
    canSuggestFinish: total !== null && current === total,
  };
}
