import { readingObservations } from "@/features/reading/performance-adapter";
import type { PlanningData, WeeklyGoal } from "./types";
import type { NormalizedGoal } from "@/domain/performance/types";
import {
  calcularDesempenhoMeta,
  calcularDesempenhoArea,
  calcularDesempenhoSemana,
} from "@/domain/performance/engine";
import type { Area } from "@/types/database";
export function normalizeGoal(
  goal: WeeklyGoal,
  data: PlanningData,
): NormalizedGoal {
  const source = data.sources.find((s) => s.goal_id === goal.id);
  if (!source || !["MANUAL", "MODULE"].includes(source.kind))
    throw new Error("Fonte manual canônica não encontrada.");
  return {
    id: goal.id,
    type: goal.type,
    target: goal.target,
    basis: goal.basis,
    frequencyMode: goal.frequency_mode,
    expectedObservations: goal.expected_observations,
    sourceKind: source.kind,
    state: goal.state,
    observations:
      source.kind === "MODULE"
        ? readingObservations(
            goal,
            source,
            data.week!.start_date,
            data.reading_books || [],
            data.reading_logs || [],
            data.area_modules || [],
          )
        : data.records
            .filter((r) => r.goal_id === goal.id && !r.is_deleted)
            .map((r) => ({
              id: r.id,
              date: r.recorded_on,
              value: r.value,
              completed: r.completed,
            })),
  };
}
export function calculatePlanning(areas: Area[], data: PlanningData) {
  const goals = data.goals.map((goal) => ({
    id: goal.id,
    goal,
    result: calcularDesempenhoMeta(normalizeGoal(goal, data)),
  }));
  const results = areas.map((area) => ({
    id: area.id,
    area,
    goals: goals.filter((g) => g.goal.area_id === area.id),
    result: calcularDesempenhoArea(
      goals
        .filter((g) => g.goal.area_id === area.id)
        .map((g) => ({ id: g.id, result: g.result })),
    ),
  }));
  return {
    areas: results,
    week: calcularDesempenhoSemana(
      results.map((a) => ({ id: a.id, result: a.result })),
    ),
  };
}
