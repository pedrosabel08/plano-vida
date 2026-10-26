export type AreaAction = {
  id: string;
  user_id: string;
  area_id: string;
  objective_id: string | null;
  book_id: string | null;
  title: string;
  /** Calendar date/time in the account timezone, matching weekly planning. */
  due_on: string | null;
  due_time: string | null;
  completed: boolean;
  created_at: string;
  updated_at: string;
};
export type AreaActionsData = { items: AreaAction[]; error?: string };
