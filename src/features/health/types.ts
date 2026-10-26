import type { OwnedEntry } from "@/features/studies/types";
export type HealthSettings = OwnedEntry & {
  sleep_target_minutes: number | null;
};
export type SleepLog = OwnedEntry & {
  bed_at: string;
  wake_at: string;
  wake_on: string;
  timezone: string;
  energy: number | null;
  is_deleted: boolean;
};
export type HealthRoutine = OwnedEntry & {
  title: string;
  kind: "SLEEP" | "ORAL";
  starts_on: string;
  ends_on: string | null;
};
export type RoutineCheck = OwnedEntry & {
  routine_id: string;
  completed_on: string;
  completed: boolean;
};
export type HealthData = {
  settings: HealthSettings[];
  nights: SleepLog[];
  routines: HealthRoutine[];
  checks: RoutineCheck[];
};
