import { addDays } from "@/lib/dates/weeks";
import type { StudySession } from "@/features/studies/types";
export function studiesDashboard(
  sessions: StudySession[],
  start: string,
  today: string,
) {
  const valid = sessions.filter((s) => !s.is_deleted && s.studied_on <= today);
  const sum = (date: string) =>
    valid
      .filter((s) => s.studied_on === date)
      .reduce((n, s) => n + s.minutes, 0);
  const week = Array.from({ length: 7 }, (_, i) => ({
    date: addDays(start, i),
    value: sum(addDays(start, i)),
  }));
  const history = Array.from({ length: 14 }, (_, i) => ({
    date: addDays(today, i - 13),
    value: sum(addDays(today, i - 13)),
  }));
  const dates = new Set(valid.map((s) => s.studied_on));
  let cursor = dates.has(today) ? today : addDays(today, -1),
    streak = 0;
  while (dates.has(cursor)) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return {
    week,
    history,
    minutes: week.reduce((n, d) => n + d.value, 0),
    average: history.reduce((n, d) => n + d.value, 0) / 14,
    streak,
  };
}
export function studyObservations(
  sessions: StudySession[],
  areaId: string,
  start: string,
) {
  return sessions
    .filter(
      (s) =>
        s.area_id === areaId &&
        !s.is_deleted &&
        s.studied_on >= start &&
        s.studied_on < addDays(start, 7),
    )
    .map((s) => ({
      id: s.id,
      date: s.studied_on,
      value: String(s.minutes),
      completed: null,
    }));
}
