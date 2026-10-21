import { describe, it, expect, vi } from "vitest";
import { bookProgress } from "@/domain/reading/progress";
import { readingObservations } from "@/features/reading/performance-adapter";
import {
  calcularDesempenhoMeta as calculate,
  calcularDesempenhoArea as area,
} from "@/domain/performance/engine";
import type { WeeklyGoal, GoalSource } from "@/features/planning/types";
import type {
  ReadingBook,
  ReadingLog,
  AreaModule,
} from "@/features/reading/types";
import {
  OpenLibraryProvider,
  normalizeOpenLibrary,
} from "@/services/book-catalog/open-library";
import { normalizeIsbn } from "@/services/book-catalog/provider";
const goal = {
  id: "goal",
  area_id: "area",
  type: "QUANTITY",
  unit: "páginas",
  target: "70",
  basis: "WEEKLY",
  frequency_mode: "OCCURRENCES",
  expected_observations: 7,
  state: "ACTIVE",
} as WeeklyGoal;
const source = {
  kind: "MODULE",
  module: "READING",
  metric: "PAGES_READ",
  scope: "ALL_BOOKS",
  area_module_id: "module",
} as GoalSource;
const books = [
  { id: "a", area_module_id: "module", initial_tracking_page: 120 },
  { id: "b", area_module_id: "module" },
  { id: "c", area_module_id: "other-module" },
] as ReadingBook[];
const modules = [{ id: "module", area_id: "area" }] as AreaModule[];
const log = (id: string, pages = 20, extra = {}) =>
  ({
    id,
    book_id: "a",
    pages,
    read_on: "2026-10-20",
    is_deleted: false,
    ...extra,
  }) as ReadingLog;
function normalized(logs: ReadingLog[], s = source, g = goal) {
  return {
    id: g.id,
    type: g.type,
    target: g.target,
    basis: g.basis,
    frequencyMode: g.frequency_mode,
    expectedObservations: 7,
    sourceKind: "MODULE" as const,
    state: g.state,
    observations: readingObservations(g, s, "2026-10-19", books, logs, modules),
  };
}
describe("derived book progress", () => {
  it("starts at zero", () => expect(bookProgress(0, 300, []).current).toBe(0));
  it("preserves an initial page", () =>
    expect(bookProgress(120, 300, []).current).toBe(120));
  it("sums multiple logs", () =>
    expect(
      bookProgress(
        40,
        320,
        [10, 15, 20].map((pages) => ({ pages, is_deleted: false })),
      ).current,
    ).toBe(85));
  it("recalculates corrected value", () =>
    expect(
      bookProgress(0, 300, [{ pages: 8, is_deleted: false }]).current,
    ).toBe(8));
  it("ignores removed records", () =>
    expect(
      bookProgress(40, 300, [
        { pages: 80, is_deleted: true },
        { pages: 8, is_deleted: false },
      ]).current,
    ).toBe(48));
  it("rejects overflow instead of clamping", () =>
    expect(() =>
      bookProgress(120, 130, [{ pages: 11, is_deleted: false }]),
    ).toThrow());
  it("rejects total below current even without logs", () =>
    expect(() => bookProgress(120, 100, [])).toThrow());
  it("supports unknown total", () =>
    expect(
      bookProgress(120, null, [{ pages: 10, is_deleted: false }]),
    ).toMatchObject({ current: 130, percent: null, canSuggestFinish: false }));
  it("only suggests completion at exact total", () =>
    expect(
      bookProgress(120, 130, [{ pages: 10, is_deleted: false }])
        .canSuggestFinish,
    ).toBe(true));
  it.each([0, -1, 1.5])("rejects invalid log %s", (pages) =>
    expect(() =>
      bookProgress(0, 300, [{ pages, is_deleted: false }]),
    ).toThrow(),
  );
});
describe("reading adapter and unchanged engine v1", () => {
  it("all books of the bound module, never other areas", () =>
    expect(
      calculate(
        normalized([
          log("1", 20),
          log("2", 36, { book_id: "b" }),
          log("3", 80, { book_id: "c" }),
        ]),
      ).actual,
    ).toBe(56));
  it("filters an explicit book ID", () =>
    expect(
      calculate(
        normalized([log("1", 20), log("2", 36, { book_id: "b" })], {
          ...source,
          scope: "BOOK",
          book_id: "a",
        }),
      ).actual,
    ).toBe(20));
  it("filters the exact civil week and includes Sunday", () =>
    expect(
      calculate(
        normalized([
          log("a", 1, { read_on: "2026-10-18" }),
          log("b", 20, { read_on: "2026-10-19" }),
          log("c", 36, { read_on: "2026-10-25" }),
          log("d", 4, { read_on: "2026-10-26" }),
        ]),
      ).actual,
    ).toBe(56));
  it("ignores deleted logs", () =>
    expect(
      calculate(normalized([log("1", 80, { is_deleted: true }), log("2", 8)]))
        .actual,
    ).toBe(8));
  it("zero logs is zero calculable, not initial page 120", () =>
    expect(calculate(normalized([]))).toMatchObject({
      state: "CALCULABLE",
      actual: 0,
      score: 0,
    }));
  it("56/70 is 80%, score 8 and v1", () =>
    expect(calculate(normalized([log("1", 20), log("2", 36)]))).toMatchObject({
      engineVersion: "v1",
      rawPercent: 80,
      score: 8,
    }));
  it("100/70 preserves raw and capped contribution", () =>
    expect(calculate(normalized([log("1", 100)]))).toMatchObject({
      rawPercent: expect.closeTo((100 / 70) * 100),
      contributionPercent: 100,
      score: 10,
    }));
  it("does not compensate an unexecuted goal", () =>
    expect(
      area([
        { id: "one", result: calculate(normalized([log("1", 140)])) },
        { id: "two", result: calculate(normalized([])) },
      ]).performance,
    ).toBe(50));
  it("daily 10 remains a weekly target of 70", () =>
    expect(
      calculate(
        normalized([log("1", 56)], source, {
          ...goal,
          target: "10",
          basis: "DAILY",
        }),
      ),
    ).toMatchObject({ target: 70, score: 8 }));
  it("duplicate canonical IDs become INVALID instead of double counted", () =>
    expect(calculate(normalized([log("1", 20), log("1", 20)])).state).toBe(
      "INVALID",
    ));
  it("rejects incompatible source configuration", () =>
    expect(() => normalized([], { ...source, metric: null })).toThrow());
});
describe("catalog adapter", () => {
  const doc = {
    key: "/works/OL1W",
    title: "Livro",
    author_name: ["A", "B"],
    cover_i: 123,
    number_of_pages_median: 300,
    isbn: ["978-85-0000-000-0", "012345678X"],
  };
  it("normalizes authors, optional metadata and external identity", () =>
    expect(normalizeOpenLibrary(doc, "2026-10-20T12:00:00.000Z")).toMatchObject(
      {
        title: "Livro",
        authors: ["A", "B"],
        pageCount: 300,
        isbn13: "9788500000000",
        externalId: "/works/OL1W",
      },
    ));
  it("supports no cover or pagination", () =>
    expect(
      normalizeOpenLibrary({ key: "/works/OL1W", title: "Livro" }, "now"),
    ).toMatchObject({ coverUrl: null, pageCount: null, authors: [] }));
  it("normalizes ISBN separators and uppercases X", () =>
    expect(normalizeIsbn("0-12345-678-x")).toBe("012345678X"));
  it("returns results through a mockable contract", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ docs: [doc] })));
    const provider = new OpenLibraryProvider(fetcher);
    expect(await provider.search("Livro")).toHaveLength(1);
    expect(fetcher.mock.calls[0][0].hostname).toBe("openlibrary.org");
  });
  it("handles empty results", async () =>
    expect(
      await new OpenLibraryProvider(
        vi.fn().mockResolvedValue(new Response('{"docs":[]}')),
      ).search("Nada"),
    ).toEqual([]));
  it("converts ISBN to an explicit search", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('{"docs":[]}'));
    await new OpenLibraryProvider(fetcher).search("978-85-0000-000-0");
    expect(fetcher.mock.calls[0][0].searchParams.get("q")).toBe(
      "isbn:9788500000000",
    );
  });
  it.each([429, 503])("fails safely on HTTP %s", async (status) =>
    expect(
      new OpenLibraryProvider(
        vi.fn().mockResolvedValue(new Response("{}", { status })),
      ).search("Livro"),
    ).rejects.toThrow(/manualmente/),
  );
  it("fails safely on timeout/network error", async () =>
    expect(
      new OpenLibraryProvider(
        vi.fn().mockRejectedValue(new Error("offline")),
      ).search("Livro"),
    ).rejects.toThrow(/manualmente/));
  it("rejects malformed catalog payloads", async () =>
    expect(
      new OpenLibraryProvider(
        vi.fn().mockResolvedValue(new Response("{}")),
      ).search("Livro"),
    ).rejects.toThrow());
});
