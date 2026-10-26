import { describe, expect, it } from "vitest";
import {
  booksForReadingGoal,
  isReadingSource,
} from "@/features/reading/goal-source";
import type { GoalSource } from "@/features/planning/types";
import type { ReadingBook } from "@/features/reading/types";

const source: GoalSource = {
  goal_id: "goal",
  user_id: "owner",
  kind: "MODULE",
  module: "READING",
  metric: "PAGES_READ",
  scope: "ALL_BOOKS",
  area_module_id: "library",
  book_id: null,
  created_at: "",
};
const book = (id: string, owner = "owner", library = "library") =>
  ({
    id,
    user_id: owner,
    area_module_id: library,
  }) as ReadingBook;

describe("reading goal entry", () => {
  it("uses the structured source, never the goal name or pages unit", () => {
    expect(isReadingSource(source)).toBe(true);
    expect(isReadingSource({ ...source, kind: "MANUAL" })).toBe(false);
    expect(isReadingSource({ ...source, metric: null })).toBe(false);
    expect(isReadingSource({ ...source, module: null })).toBe(false);
    expect(isReadingSource(undefined)).toBe(false);
  });
  it("ALL_BOOKS only lists the source owner's books in that association", () => {
    const valid = [book("a"), book("b")];
    expect(
      booksForReadingGoal(source, [
        ...valid,
        book("foreign", "another"),
        book("elsewhere", "owner", "another-library"),
      ]),
    ).toEqual(valid);
  });
  it("BOOK fixes exactly one book, even when other valid books exist", () => {
    const a = book("a");
    expect(
      booksForReadingGoal({ ...source, scope: "BOOK", book_id: "a" }, [
        a,
        book("b"),
      ]),
    ).toEqual([a]);
    expect(
      booksForReadingGoal({ ...source, scope: "BOOK", book_id: "missing" }, [
        a,
      ]),
    ).toEqual([]);
  });
  it("empty or inconsistent configuration cannot fall back to generic pages", () => {
    expect(booksForReadingGoal(source, [])).toEqual([]);
    expect(
      booksForReadingGoal({ ...source, kind: "MANUAL" }, [book("a")]),
    ).toEqual([]);
    expect(
      booksForReadingGoal({ ...source, area_module_id: null }, [book("a")]),
    ).toEqual([]);
    expect(
      booksForReadingGoal({ ...source, scope: null }, [book("a")]),
    ).toEqual([]);
  });
});
