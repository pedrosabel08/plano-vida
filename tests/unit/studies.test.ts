import { expect, it } from "vitest";
import {
  studiesDashboard,
  studyObservations,
} from "@/domain/studies/dashboard";
import type { StudySession } from "@/features/studies/types";
const session = (id: string, date: string, minutes: number, deleted = false) =>
  ({
    id,
    area_id: "a",
    studied_on: date,
    minutes,
    is_deleted: deleted,
  }) as StudySession;
it("sums integer minutes, fills missing dates, respects distinct days, deleted and future logs", () => {
  const logs = [
    session("1", "2026-10-19", 60),
    session("2", "2026-10-24", 25),
    session("3", "2026-10-24", 35),
    session("4", "2026-10-25", 30),
    session("5", "2026-10-26", 60),
    session("6", "2026-10-23", 100, true),
  ];
  const d = studiesDashboard(logs, "2026-10-19", "2026-10-25");
  expect(d.minutes).toBe(150);
  expect(d.streak).toBe(2);
  expect(d.average).toBe(150 / 14);
  expect(d.week[1].value).toBe(0);
  expect(studyObservations(logs, "a", "2026-10-19")).toHaveLength(4);
});
it("accepts yesterday, stops at gaps and does not depend on selected week", () => {
  const logs = [session("1", "2026-10-24", 1), session("2", "2026-10-22", 1)];
  expect(studiesDashboard(logs, "2026-10-12", "2026-10-25").streak).toBe(1);
  expect(studiesDashboard([], "2026-10-19", "2026-10-25").streak).toBe(0);
});
