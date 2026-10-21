export type ActionState = {
  status: "idle" | "error" | "success";
  message?: string;
  fields?: Record<string, string[] | undefined>;
};
export const INITIAL_STATE: ActionState = { status: "idle" };
