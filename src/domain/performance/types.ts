import type { Fraction } from "./fraction";
export type GoalType = "QUANTITY" | "FREQUENCY" | "AVERAGE" | "COMPLETION";
export type GoalSourceKind = "MANUAL" | "MODULE" | "ACTION";
export type ResultState =
  "CALCULABLE" | "NO_GOALS" | "INSUFFICIENT_DATA" | "INVALID" | "EXCLUDED";
export type Observation = {
  id: string;
  date: string;
  value: string | number | null;
  completed: boolean | null;
};
export type NormalizedGoal = {
  id: string;
  type: GoalType;
  target: string | number;
  basis: "WEEKLY" | "DAILY";
  frequencyMode: "OCCURRENCES" | "DISTINCT_DAYS";
  expectedObservations: number;
  sourceKind: GoalSourceKind;
  state: "ACTIVE" | "CANCELLED";
  observations: Observation[];
};
export type PerformanceResult = {
  engineVersion: "v1";
  state: ResultState;
  rawPercent: number | null;
  contributionPercent: number | null;
  score: number | null;
  actual: number | null;
  target: number | null;
  observed: number;
  expected: number;
  coveragePercent: number | null;
  exact: {
    raw: Fraction;
    contribution: Fraction;
    score: Fraction;
    actual: Fraction;
    target: Fraction;
    coverage: Fraction | null;
  } | null;
  reason?: string;
};
export type AggregateResult = {
  engineVersion: "v1";
  state: ResultState;
  performance: number | null;
  score: number | null;
  exact: { performance: Fraction; score: Fraction } | null;
  calculableCount: number;
  totalCount: number;
  incompleteCount: number;
  breakdown: { id: string; result: PerformanceResult | AggregateResult }[];
};
