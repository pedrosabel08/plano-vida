import { addDays } from "@/lib/dates/weeks";
import { clockMinutes, circularRange } from "./time";
import type { HealthData, HealthRoutine } from "@/features/health/types";
export function routineExpected(routine: HealthRoutine, date: string) {
  return (
    date >= routine.starts_on && (!routine.ends_on || date <= routine.ends_on)
  );
}
export function healthDashboard(
  data: HealthData,
  start: string,
  today: string,
) {
  const nights = data.nights.filter((l) => !l.is_deleted && l.wake_on <= today),
    duration = (l: (typeof nights)[number]) =>
      (Date.parse(l.wake_at) - Date.parse(l.bed_at)) / 60000;
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i),
      night = nights.find((l) => l.wake_on === date);
    return { date, value: night ? duration(night) : 0, missing: !night };
  });
  const recorded = nights.filter(
      (l) => l.wake_on >= start && l.wake_on < addDays(start, 7),
    ),
    minutes = recorded.reduce((n, l) => n + duration(l), 0);
  const consistency = (kind: "ORAL" | "SLEEP") => {
    const days = week.map((d) => {
      const expected =
        d.date <= today
          ? data.routines.filter(
              (r) => r.kind === kind && routineExpected(r, d.date),
            )
          : [];
      const done = expected.filter((r) =>
        data.checks.some(
          (c) =>
            c.routine_id === r.id && c.completed_on === d.date && c.completed,
        ),
      ).length;
      return {
        date: d.date,
        expected: expected.length,
        done,
        value: expected.length ? (done / expected.length) * 100 : 0,
        missing: !expected.length,
      };
    });
    const expected = days.reduce((n, d) => n + d.expected, 0),
      done = days.reduce((n, d) => n + d.done, 0);
    return {
      days,
      expected,
      done,
      percent: expected ? (done / expected) * 100 : null,
    };
  };
  return {
    week,
    average: recorded.length ? minutes / recorded.length : null,
    coverage: recorded.length,
    sevenHours: recorded.filter((l) => duration(l) >= 420).length,
    bedVariation: circularRange(
      recorded.map((l) => clockMinutes(l.bed_at, l.timezone)),
    ),
    wakeVariation: circularRange(
      recorded.map((l) => clockMinutes(l.wake_at, l.timezone)),
    ),
    energy: nights.find((l) => l.wake_on === today)?.energy ?? null,
    oral: consistency("ORAL"),
    rituals: consistency("SLEEP"),
  };
}
