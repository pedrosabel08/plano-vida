import type { Json } from "./database";
export type EntryRpc =
  | "save_study_subject"
  | "save_study_session"
  | "save_finance_category"
  | "save_finance_transaction"
  | "save_finance_budget"
  | "save_finance_goal"
  | "save_finance_contribution"
  | "save_career_project"
  | "save_career_milestone"
  | "save_career_commitment"
  | "save_career_setting"
  | "save_career_review"
  | "save_health_setting"
  | "save_sleep_log"
  | "save_health_routine"
  | "save_routine_check";
export type SpecializedFunctions = {
  [K in EntryRpc]: {
    Args: { p_item: Json; p_id: string; p_expected: string | null };
    Returns: string;
  };
} & {
  get_studies_data: { Args: { p_area_id: string }; Returns: Json };
  get_finance_data: { Args: { p_area_id: string }; Returns: Json };
  get_career_data: { Args: { p_area_id: string }; Returns: Json };
  get_health_data: { Args: { p_area_id: string }; Returns: Json };
  set_area_dashboard: {
    Args: { p_area_id: string; p_dashboard: string };
    Returns: undefined;
  };
  get_area_dashboard: { Args: { p_area_id: string }; Returns: string | null };
  get_study_planning_data: { Args: Record<string, never>; Returns: Json };
  save_study_goal: {
    Args: {
      p_start_date: string;
      p_area_id: string;
      p_goal: Json;
      p_goal_id: string | null;
    };
    Returns: string;
  };
};
