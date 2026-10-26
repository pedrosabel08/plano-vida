import type { OwnedEntry, StudySession } from "@/features/studies/types";
export type CareerProject = OwnedEntry & {
  title: string;
  kind: "WORK" | "DEVELOPMENT";
  due_on: string | null;
  objective_id: string | null;
  status: "ACTIVE" | "COMPLETED" | "ARCHIVED";
};
export type CareerMilestone = OwnedEntry & {
  project_id: string;
  title: string;
  kind: "TASK" | "MILESTONE" | "LESSON" | "DELIVERY";
  due_on: string | null;
  completed_on: string | null;
  is_deleted: boolean;
};
export type CareerCommitment = OwnedEntry & {
  project_id: string | null;
  title: string;
  kind: "MEETING" | "DELIVERY";
  due_on: string;
  completed_on: string | null;
  is_deleted: boolean;
};
export type CareerSettings = OwnedEntry & {
  study_area_id: string | null;
  study_target_minutes: number | null;
  objective_id: string | null;
};
export type CareerReview = OwnedEntry & {
  reviewed_on: string;
  wins: string;
  lessons: string;
  next_steps: string;
};
export type CareerData = {
  projects: CareerProject[];
  milestones: CareerMilestone[];
  commitments: CareerCommitment[];
  settings: CareerSettings[];
  reviews: CareerReview[];
  study_sessions: StudySession[];
};
