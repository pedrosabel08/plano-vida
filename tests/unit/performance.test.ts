import { describe, it, expect } from "vitest";
import {
  calcularDesempenhoMeta as goal,
  calcularDesempenhoArea as area,
  calcularDesempenhoSemana as week,
} from "@/domain/performance/engine";
import {
  formatScore,
  formatPercent,
  formatFraction,
} from "@/lib/formatting/performance";
import { decimal } from "@/domain/performance/fraction";
import {
  mondayForDate,
  resolveWeekStart,
  todayInTimezone,
} from "@/lib/dates/weeks";
import type { NormalizedGoal, Observation } from "@/domain/performance/types";
function input(
  type: NormalizedGoal["type"] = "QUANTITY",
  target: string | number = 70,
  values: (string | number)[] = [],
  extra: Partial<NormalizedGoal> = {},
): NormalizedGoal {
  return {
    id: "goal",
    type,
    target,
    basis: "WEEKLY",
    frequencyMode: "OCCURRENCES",
    expectedObservations: 7,
    sourceKind: "MANUAL",
    state: "ACTIVE",
    observations: values.map((value, i) => ({
      id: String(i),
      date: "2026-10-" + String(19 + i).padStart(2, "0"),
      value,
      completed: null,
    })),
    ...extra,
  };
}
describe("v1 quantity", () => {
  it.each([
    [0, 0, 0],
    [35, 50, 5],
    [56, 80, 8],
    [70, 100, 10],
    [100, (100 / 70) * 100, 10],
    [140, 200, 10],
  ])("%s/70", (value, raw, score) => {
    const r = goal(input("QUANTITY", 70, [value]));
    expect(r.rawPercent).toBeCloseTo(raw, 10);
    expect(r.contributionPercent).toBe(Math.min(raw, 100));
    expect(r.score).toBeCloseTo(score, 12);
  });
  it("empty source means zero quantity", () =>
    expect(goal(input()).actual).toBe(0));
  it("daily target becomes seven days without midweek proration", () => {
    const r = goal(input("QUANTITY", 10, [56], { basis: "DAILY" }));
    expect(r.target).toBe(70);
    expect(r.rawPercent).toBe(80);
  });
});
describe("v1 frequency", () => {
  it.each([0, 2, 3, 5])("%s/3 sessions", (value) => {
    const r = goal(input("FREQUENCY", 3, [value]));
    expect(r.rawPercent).toBeCloseTo((value / 3) * 100);
    expect(r.score).toBeCloseTo(Math.min(value / 3, 1) * 10);
  });
  it("counts distinct days only when explicitly configured", () => {
    const a = input("FREQUENCY", 3, [1, 1, 1], {
      frequencyMode: "DISTINCT_DAYS",
    });
    a.observations[2].date = a.observations[1].date;
    expect(goal(a).actual).toBe(2);
    expect(goal({ ...a, frequencyMode: "OCCURRENCES" }).actual).toBe(3);
  });
  it("rejects fractional occurrence", () =>
    expect(goal(input("FREQUENCY", 3, ["1.000000000000000001"])).state).toBe(
      "INVALID",
    ));
});
describe("v1 average", () => {
  it("keeps performance and coverage independent", () => {
    const r = goal(input("AVERAGE", 8, Array(6).fill("7.4")));
    expect(r.actual).toBe(7.4);
    expect(r.rawPercent).toBe(92.5);
    expect(r.score).toBe(9.25);
    expect(r.expected).toBe(7);
    expect(r.observed).toBe(6);
    expect(r.coveragePercent).toBeCloseTo((6 / 7) * 100);
    expect(formatScore(r.exact!.score)).toBe("9,3");
    expect(formatFraction(r.exact!.coverage!, 0)).toBe("86");
  });
  it("absence is not mean zero", () => {
    const r = goal(input("AVERAGE", 8));
    expect(r.state).toBe("INSUFFICIENT_DATA");
    expect(r.actual).toBeNull();
    expect(r.expected).toBe(7);
  });
  it("an explicit zero is an observation", () => {
    const r = goal(input("AVERAGE", 8, [0]));
    expect(r.state).toBe("CALCULABLE");
    expect(r.actual).toBe(0);
    expect(r.observed).toBe(1);
  });
  it("caps contribution but preserves overachievement", () => {
    const r = goal(input("AVERAGE", 8, [10]));
    expect(r.rawPercent).toBe(125);
    expect(r.contributionPercent).toBe(100);
  });
  it("rejects duplicate daily observations", () => {
    const a = input("AVERAGE", 8, [7, 8]);
    a.observations[1].date = a.observations[0].date;
    expect(goal(a).state).toBe("INVALID");
  });
});
describe("v1 completion", () => {
  it.each([false, true])("binary %s", (completed) => {
    const observations: Observation[] = [
      { id: "one", date: "2026-10-20", value: null, completed },
    ];
    expect(goal(input("COMPLETION", 1, [], { observations })).rawPercent).toBe(
      completed ? 100 : 0,
    );
  });
  it("defaults to not completed", () =>
    expect(goal(input("COMPLETION", 1)).score).toBe(0));
});
describe("aggregation", () => {
  it("one goal", () =>
    expect(
      area([{ id: "one", result: goal(input("QUANTITY", 70, [56])) }])
        .performance,
    ).toBe(80));
  it("rejects duplicated goal and area IDs instead of double counting", () => {
    const entry = { id: "same", result: goal(input()) };
    expect(area([entry, entry]).state).toBe("INVALID");
    const aggregate = { id: "same", result: area([entry]) };
    expect(week([aggregate, aggregate]).state).toBe("INVALID");
  });
  it("equal goal weights", () =>
    expect(
      area(
        [100, 80, 60].map((v, i) => ({
          id: String(i),
          result: goal(input("QUANTITY", 100, [v])),
        })),
      ).performance,
    ).toBe(80));
  it("200% and zero produce 50%, while raw result remains 200%", () => {
    const first = goal(input("QUANTITY", 70, [140]));
    const r = area([
      { id: "a", result: first },
      { id: "b", result: goal(input()) },
    ]);
    expect(first.rawPercent).toBe(200);
    expect(r.performance).toBe(50);
    expect(r.score).toBe(5);
  });
  it("no goals is not zero", () => {
    expect(area([]).state).toBe("NO_GOALS");
    expect(area([]).score).toBeNull();
  });
  it("excludes a cancelled goal", () =>
    expect(
      area([
        {
          id: "x",
          result: goal(input("QUANTITY", 70, [], { state: "CANCELLED" })),
        },
      ]).state,
    ).toBe("NO_GOALS"));
  it("explains missing average data in a partial area result", () => {
    const r = area([
      { id: "q", result: goal(input("QUANTITY", 70, [56])) },
      { id: "a", result: goal(input("AVERAGE", 8)) },
    ]);
    expect(r.performance).toBe(80);
    expect(r.incompleteCount).toBe(1);
    expect(r.breakdown).toHaveLength(2);
  });
  it("averages only calculable areas", () => {
    const areas = [80, 100, 60].map((v, i) => ({
      id: String(i),
      result: area([{ id: "g", result: goal(input("QUANTITY", 100, [v])) }]),
    }));
    areas.push({ id: "no-goals", result: area([]) });
    expect(week(areas).performance).toBe(80);
    expect(week(areas).calculableCount).toBe(3);
  });
  it("areas have equal weight regardless of number of goals", () => {
    const a = area([{ id: "one", result: goal(input("QUANTITY", 1, [1])) }]);
    const b = area(
      [1, 2, 3, 4, 5].map((i) => ({
        id: String(i),
        result: goal(input("QUANTITY", 1, [0])),
      })),
    );
    expect(
      week([
        { id: "a", result: a },
        { id: "b", result: b },
      ]).performance,
    ).toBe(50);
  });
  it("all unplanned weeks have no score", () =>
    expect(week([{ id: "x", result: area([]) }]).score).toBeNull());
});
describe("numeric invariants", () => {
  it.each([0, -1, "NaN", "Infinity"])("invalid target %s", (target) =>
    expect(goal(input("QUANTITY", target, [1])).state).toBe("INVALID"),
  );
  it("does not round between levels", () => {
    const a = area(
      [3, 7].map((n, i) => ({
        id: String(i),
        result: goal(input("QUANTITY", n, [1])),
      })),
    );
    expect(a.exact!.performance).toEqual({ n: "500", d: "21" });
    expect(a.performance).toBeCloseTo((100 / 3 + 100 / 7) / 2, 12);
  });
  it("sums decimals exactly", () => {
    const r = goal(input("QUANTITY", "0.3", ["0.1", "0.2"]));
    expect(r.rawPercent).toBe(100);
    expect(r.exact!.actual).toEqual({ n: "3", d: "10" });
  });
  it("rounds only when formatting", () => {
    const r = goal(input("QUANTITY", 70, [100]));
    expect(r.rawPercent).not.toBe(143);
    expect(formatPercent(r.exact!.raw)).toBe("143%");
    expect(formatScore(r.exact!.score)).toBe("10,0");
  });
  it("rejects duplicated record IDs", () => {
    const a = input("QUANTITY", 70, [1, 1]);
    a.observations[1].id = a.observations[0].id;
    expect(goal(a).state).toBe("INVALID");
  });
  it("formats rational half-up without binary artifacts", () =>
    expect(formatScore(decimal("9.25"))).toBe("9,3"));
});
describe("week identity", () => {
  it("normalizes Sunday and year boundary to Monday", () => {
    expect(mondayForDate("2027-01-03")).toBe("2026-12-28");
    expect(mondayForDate("2026-10-25")).toBe("2026-10-19");
  });
  it("uses user timezone, not host timezone", () => {
    const now = new Date("2026-10-26T01:00:00Z");
    expect(todayInTimezone(now, "America/Sao_Paulo")).toBe("2026-10-25");
    expect(resolveWeekStart(undefined, "America/Sao_Paulo", now)).toBe(
      "2026-10-19",
    );
    expect(resolveWeekStart(undefined, "Europe/Lisbon", now)).toBe(
      "2026-10-26",
    );
  });
  it("rejects impossible dates", () =>
    expect(() => mondayForDate("2026-02-30")).toThrow());
});
