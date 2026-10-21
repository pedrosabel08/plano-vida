import type { GoalType, GoalSourceKind } from "@/domain/performance/types";
export type Objective = {
  id: string;
  user_id: string;
  area_id: string | null;
  title: string;
  type: "QUANTITATIVE" | "PERCENTAGE" | "QUALITATIVE";
  target: string | null;
  current_value: string | null;
  unit: string | null;
  due_date: string | null;
  state: "ACTIVE" | "COMPLETED";
  created_at: string;
  updated_at: string;
};
export type Week = {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  timezone: string;
  starts_at: string;
  ends_at_exclusive: string;
  created_at: string;
};
export type AreaWeeklyPlan = {
  id: string;
  user_id: string;
  week_id: string;
  area_id: string;
  state: "UNPLANNED" | "PLANNED";
  created_at: string;
  updated_at: string;
};
export type WeeklyGoal = {
  id: string;
  user_id: string;
  week_id: string;
  area_id: string;
  plan_id: string;
  objective_id: string | null;
  title: string;
  type: GoalType;
  target: string;
  unit: string;
  basis: "WEEKLY" | "DAILY";
  frequency_mode: "OCCURRENCES" | "DISTINCT_DAYS";
  expected_observations: number;
  observation_unit: string;
  state: "ACTIVE" | "CANCELLED";
  created_at: string;
  updated_at: string;
};
export type GoalSource = {
  goal_id: string;
  user_id: string;
  kind: GoalSourceKind;
  created_at: string;
};
export type GoalRecord = {
  id: string;
  user_id: string;
  goal_id: string;
  goal_type: GoalType;
  recorded_on: string;
  value: string | null;
  completed: boolean | null;
  operation_id: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
};
export type PlanningData = {
  week: Week | null;
  plans: AreaWeeklyPlan[];
  goals: WeeklyGoal[];
  sources: GoalSource[];
  records: GoalRecord[];
};
