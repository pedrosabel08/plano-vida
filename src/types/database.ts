import type {
  AreaModule,
  Book,
  ReadingLog,
  ExternalBookReference,
} from "@/features/reading/types";
import type {
  Objective,
  Week,
  AreaWeeklyPlan,
  WeeklyGoal,
  GoalSource,
  GoalRecord,
} from "@/features/planning/types";
// Application schema contract for Foundation + Phase 2.
// Planning RPC DTOs preserve NUMERIC values as decimal text.
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];
export type Profile = {
  user_id: string;
  display_name: string;
  timezone: string;
  onboarding_completed_at: string | null;
  created_at: string;
  updated_at: string;
};
export type Area = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};
type Table<Row, Insert, Update> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};
export type Database = {
  public: {
    Tables: {
      area_modules: Table<
        AreaModule,
        Pick<AreaModule, "area_id">,
        { enabled: boolean }
      >;
      books: Table<
        Book,
        Omit<Book, "id" | "created_at" | "updated_at">,
        Partial<
          Pick<
            Book,
            | "title"
            | "authors"
            | "total_pages"
            | "initial_tracking_page"
            | "status"
            | "cover_url"
            | "isbn_10"
            | "isbn_13"
          >
        >
      >;
      reading_logs: Table<
        ReadingLog,
        Omit<ReadingLog, "id" | "created_at" | "updated_at">,
        Partial<Pick<ReadingLog, "read_on" | "pages" | "is_deleted">>
      >;
      external_book_references: Table<
        ExternalBookReference,
        Omit<ExternalBookReference, "id" | "imported_at">,
        never
      >;

      objectives: Table<
        Objective,
        Omit<Objective, "id" | "created_at" | "updated_at">,
        Partial<Omit<Objective, "id" | "user_id" | "created_at" | "updated_at">>
      >;
      weeks: Table<Week, { user_id?: string; start_date: string }, never>;
      area_weekly_plans: Table<
        AreaWeeklyPlan,
        Pick<AreaWeeklyPlan, "week_id" | "area_id">,
        { state: AreaWeeklyPlan["state"] }
      >;
      weekly_goals: Table<
        WeeklyGoal,
        Omit<WeeklyGoal, "id" | "created_at" | "updated_at">,
        Partial<
          Omit<
            WeeklyGoal,
            | "id"
            | "user_id"
            | "week_id"
            | "area_id"
            | "plan_id"
            | "created_at"
            | "updated_at"
          >
        >
      >;
      goal_sources: Table<GoalSource, Pick<GoalSource, "goal_id">, never>;
      goal_records: Table<
        GoalRecord,
        Omit<GoalRecord, "id" | "created_at" | "updated_at">,
        Partial<
          Pick<GoalRecord, "recorded_on" | "value" | "completed" | "is_deleted">
        >
      >;
      profiles: Table<
        Profile,
        Pick<Profile, "user_id"> & Partial<Omit<Profile, "user_id">>,
        Partial<
          Pick<Profile, "display_name" | "timezone" | "onboarding_completed_at">
        >
      >;
      areas: Table<
        Area,
        Pick<Area, "name" | "icon" | "color" | "sort_order"> & {
          user_id?: string;
        },
        Partial<Pick<Area, "name" | "icon" | "color" | "sort_order">>
      >;
    };
    Views: { [_ in never]: never };
    Functions: {
      set_reading_module: {
        Args: { p_area_id: string; p_enabled?: boolean };
        Returns: string;
      };
      save_reading_book: {
        Args: { p_module_id: string; p_book: Json; p_book_id?: string | null };
        Returns: string;
      };
      save_reading_log: {
        Args: { p_book_id: string; p_log: Json; p_log_id?: string | null };
        Returns: string;
      };
      save_reading_goal: {
        Args: {
          p_start_date: string;
          p_area_id: string;
          p_goal: Json;
          p_book_id?: string | null;
          p_goal_id?: string | null;
        };
        Returns: string;
      };
      get_reading_books: { Args: Record<string, never>; Returns: Json };
      get_reading_data: { Args: { p_area_id: string }; Returns: Json };

      ensure_planning_week: { Args: { p_start_date: string }; Returns: string };
      list_objectives: { Args: Record<string, never>; Returns: Json };
      get_planning_data: { Args: { p_start_date: string }; Returns: Json };
      save_weekly_goal: {
        Args: {
          p_start_date: string;
          p_area_id: string;
          p_goal: Json;
          p_goal_id: string | null;
        };
        Returns: string;
      };
      save_goal_record: {
        Args: { p_goal_id: string; p_record: Json; p_record_id: string | null };
        Returns: string;
      };
      create_area: {
        Args: { p_name: string; p_icon: string; p_color: string };
        Returns: string;
      };
      reorder_areas: { Args: { p_ids: string[] }; Returns: undefined };
      complete_onboarding: {
        Args: { p_display_name: string; p_timezone: string; p_areas: Json };
        Returns: undefined;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
