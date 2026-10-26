import { it, expect } from "vitest";
import { localToInstant, circularRange } from "@/domain/health/time";
import { healthDashboard } from "@/domain/health/dashboard";
import type { HealthData } from "@/features/health/types";
it("resolves account timezone across midnight, DST and ambiguous/nonexistent clock times", () => {
  expect(localToInstant("2026-10-24T23:00", "America/Sao_Paulo")).toBe(
    "2026-10-25T02:00:00.000Z",
  );
  expect(() => localToInstant("2026-03-08T02:30", "America/New_York")).toThrow(
    "não existe",
  );
  expect(() => localToInstant("2026-11-01T01:30", "America/New_York")).toThrow(
    "duas vezes",
  );
  expect(localToInstant("2026-11-01T01:30", "America/New_York", "-04:00")).toBe(
    "2026-11-01T05:30:00.000Z",
  );
  expect(localToInstant("2026-11-01T01:30", "America/New_York", "-05:00")).toBe(
    "2026-11-01T06:30:00.000Z",
  );
  expect(() => localToInstant("2026-02-30T01:30", "UTC")).toThrow();
});
it("averages only observed nights and computes circular clock variation without treating midnight as a 24h difference", () => {
  expect(circularRange([1430, 10])).toBe(20);
  const d = healthDashboard(
    {
      settings: [],
      nights: [
        {
          bed_at: "2026-10-20T02:00:00Z",
          wake_at: "2026-10-20T10:00:00Z",
          wake_on: "2026-10-20",
          timezone: "America/Sao_Paulo",
        },
        {
          bed_at: "2026-10-21T03:00:00Z",
          wake_at: "2026-10-21T09:00:00Z",
          wake_on: "2026-10-21",
          timezone: "America/Sao_Paulo",
        },
      ],
      routines: [],
      checks: [],
    } as unknown as HealthData,
    "2026-10-19",
    "2026-10-25",
  );
  expect(d.average).toBe(420);
  expect(d.coverage).toBe(2);
  expect(d.sevenHours).toBe(1);
  expect(d.week[0].missing).toBe(true);
  expect(d.bedVariation).toBe(60);
});
it("counts scheduled oral items only through today and preserves ended routines in historical coverage", () => {
  const data = {
    settings: [],
    nights: [],
    routines: [
      { id: "a", kind: "ORAL", starts_on: "2026-10-19", ends_on: "2026-10-20" },
      { id: "b", kind: "ORAL", starts_on: "2026-10-20", ends_on: null },
    ],
    checks: [
      { routine_id: "a", completed_on: "2026-10-19", completed: true },
      { routine_id: "b", completed_on: "2026-10-20", completed: true },
    ],
  } as unknown as HealthData;
  const d = healthDashboard(data, "2026-10-19", "2026-10-21");
  expect(d.oral.expected).toBe(4);
  expect(d.oral.done).toBe(2);
  expect(d.oral.percent).toBe(50);
  expect(d.oral.days[3].missing).toBe(true);
  expect(d.average).toBe(null);
});
