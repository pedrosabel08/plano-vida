import { addDays } from "@/lib/dates/weeks";
import type { ReadingLog } from "@/features/reading/types";

/** Dates are calendar dates in the profile timezone, never browser-local dates. */
export function readingDashboard(
  logs: ReadingLog[],
  start: string,
  today: string,
) {
  const daily = new Map<string, number>();
  const seen = new Set<string>();
  for (const log of logs) {
    if (log.is_deleted || seen.has(log.id)) continue;
    seen.add(log.id);
    daily.set(log.read_on, (daily.get(log.read_on) || 0) + log.pages);
  }
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = addDays(start, i);
    return { date, pages: daily.get(date) || 0 };
  });
  const history = Array.from({ length: 14 }, (_, i) => {
    const date = addDays(today, i - 13);
    return { date, pages: daily.get(date) || 0 };
  });
  // Yesterday keeps a streak alive until today ends. Future entries never extend it.
  let cursor = daily.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while ((daily.get(cursor) || 0) > 0) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return {
    week,
    pages: week.reduce((sum, day) => sum + day.pages, 0),
    history,
    average: history.reduce((sum, day) => sum + day.pages, 0) / 14,
    streak,
  };
}
