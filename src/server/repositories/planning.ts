import "server-only";
import { cache } from "react";
import { requireOnboardedAccount, getAreas } from "./account";
import { resolveWeekStart } from "@/lib/dates/weeks";
import { calculatePlanning } from "@/features/planning/normalize";
import type { PlanningData, Objective } from "@/features/planning/types";
import type { StudySession } from "@/features/studies/types";
export const getObjectives = cache(async () => {
  const { supabase } = await requireOnboardedAccount();
  const { data, error } = await supabase.rpc("list_objectives");
  if (error) throw new Error("Não foi possível carregar os objetivos.");
  return data as unknown as Objective[];
});
export const getPlanning = cache(async (value?: string) => {
  const { profile, supabase } = await requireOnboardedAccount();
  const start = resolveWeekStart(value, profile.timezone);
  const [areas, objectives, response, studies] = await Promise.all([
    getAreas(),
    getObjectives(),
    supabase.rpc("get_planning_data", { p_start_date: start }),
    supabase.rpc("get_study_planning_data", {}),
  ]);
  if (response.error)
    throw new Error(
      "Não foi possível carregar o planejamento. Confira a migration da Fase 2.",
    );
  const data = response.data as unknown as PlanningData;
  if (studies.error && data.sources.some((s) => s.module === "STUDIES"))
    throw new Error("Não foi possível carregar as sessões de estudo.");
  data.study_sessions = (studies.data || []) as unknown as StudySession[];
  return {
    start,
    areas,
    objectives,
    data,
    profile,
    performance: calculatePlanning(areas, data),
  };
});
