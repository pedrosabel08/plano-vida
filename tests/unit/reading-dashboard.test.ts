import { describe, expect, it } from "vitest";
import { readingDashboard } from "@/domain/reading/dashboard";
import type { ReadingLog } from "@/features/reading/types";
import { todayInTimezone } from "@/lib/dates/weeks";
const log = (id: string, read_on: string, pages: number, is_deleted = false) =>
  ({ id, read_on, pages, is_deleted }) as ReadingLog;

describe("reading dashboard from canonical logs", () => {
  it("sums separate sessions and books by day, without repeated IDs or deleted logs", () => {
    const a = log("a", "2026-10-19", 21);
    const stats = readingDashboard(
      [
        a,
        a,
        log("b", "2026-10-19", 35),
        log("c", "2026-10-20", 8, true),
        log("d", "2026-10-26", 100),
      ],
      "2026-10-19",
      "2026-10-25",
    );
    expect(stats.pages).toBe(56);
    expect(stats.week.map((d) => d.pages)).toEqual([56, 0, 0, 0, 0, 0, 0]);
    expect(stats.history).toHaveLength(14);
    expect(stats.average).toBe(4);
    expect(stats.streak).toBe(0);
  });
  it("uses all fourteen calendar days for the mean and crosses month/year boundaries", () => {
    const stats = readingDashboard(
      [
        log("a", "2025-12-31", 14),
        log("b", "2026-01-01", 28),
        log("c", "2025-12-18", 999),
      ],
      "2025-12-29",
      "2026-01-01",
    );
    expect(stats.history[0].date).toBe("2025-12-19");
    expect(stats.history[13].date).toBe("2026-01-01");
    expect(stats.average).toBe(3);
    expect(stats.streak).toBe(2);
  });
  it("keeps yesterday's streak alive, ignores future entries and breaks on gaps", () => {
    const logs = [
      log("a", "2026-10-22", 10),
      log("b", "2026-10-23", 4),
      log("c", "2026-10-24", 2),
      log("d", "2026-10-26", 100),
    ];
    expect(readingDashboard(logs, "2026-10-19", "2026-10-25").streak).toBe(3);
    expect(readingDashboard(logs, "2026-10-19", "2026-10-26").streak).toBe(1);
    expect(readingDashboard(logs, "2026-10-19", "2026-10-28").streak).toBe(0);
  });
  it("returns real zeros for an empty library", () => {
    const stats = readingDashboard([], "2026-10-19", "2026-10-25");
    expect(stats.pages).toBe(0);
    expect(stats.average).toBe(0);
    expect(stats.streak).toBe(0);
    expect(stats.week.every((d) => d.pages === 0)).toBe(true);
  });
  it("respects the account date near UTC midnight", () => {
    const today = todayInTimezone(
      new Date("2026-10-26T01:00:00Z"),
      "America/Sao_Paulo",
    );
    expect(today).toBe("2026-10-25");
    expect(
      readingDashboard([log("a", today, 7)], "2026-10-19", today).streak,
    ).toBe(1);
  });
});
