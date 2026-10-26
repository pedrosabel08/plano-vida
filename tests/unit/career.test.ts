import { it, expect } from "vitest";
import { careerDashboard } from "@/domain/career/dashboard";
import type { CareerData } from "@/features/career/types";
it("derives progress from milestones, excludes undated projects from rhythm, counts real commitments and linked study", () => {
  const data = {
    projects: [
      { id: "a", status: "ACTIVE", due_on: "2026-10-30", kind: "WORK" },
      { id: "b", status: "ACTIVE", due_on: null, kind: "DEVELOPMENT" },
      { id: "c", status: "ACTIVE", due_on: "2026-10-30", kind: "WORK" },
    ],
    milestones: [
      { project_id: "a", completed_on: "2026-10-20", due_on: "2026-10-21" },
      { project_id: "a", completed_on: null, due_on: "2026-10-28" },
      { project_id: "c", completed_on: null, due_on: "2026-10-20" },
    ],
    commitments: [
      { kind: "MEETING", due_on: "2026-10-20", completed_on: "2026-10-20" },
      { kind: "MEETING", due_on: "2026-10-24", completed_on: null },
      { kind: "DELIVERY", due_on: "2026-10-18", completed_on: "2026-10-18" },
    ],
    settings: [{ study_area_id: "s" }],
    study_sessions: [
      { area_id: "s", minutes: 90, studied_on: "2026-10-20" },
      { area_id: "other", minutes: 1000, studied_on: "2026-10-20" },
    ],
    reviews: [],
  } as unknown as CareerData;
  const d = careerDashboard(data, "2026-10-19", "2026-10-25");
  expect(d.projects[0].percent).toBe(50);
  expect(d.projects[1].percent).toBe(null);
  expect(d.measurable).toHaveLength(2);
  expect(d.onTrack).toBe(1);
  expect(d.meetings).toEqual({ done: 1, total: 2 });
  expect(d.deliveries).toEqual({ done: 1, total: 1 });
  expect(d.minutes).toBe(90);
});
