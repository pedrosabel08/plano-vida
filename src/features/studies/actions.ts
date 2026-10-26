"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { dateInput, weekInput } from "@/features/planning/schema";
import {
  field,
  integer,
  nullableId,
  title,
  saveEntry,
  failure,
} from "@/features/specialized/mutation";
import { requireOnboardedAccount } from "@/server/repositories/account";
import type { ActionState } from "@/types/actions";
export async function saveStudySubject(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = z
    .object({
      title,
      target_minutes: z
        .union([integer(), z.literal("")])
        .transform((v) => (v === "" ? null : v)),
      objective_id: nullableId,
      archived: z.boolean(),
    })
    .safeParse({
      title: field(form, "title"),
      target_minutes: field(form, "target_minutes"),
      objective_id: field(form, "objective_id"),
      archived: field(form, "archived") === "true",
    });
  return parsed.success
    ? saveEntry("save_study_subject", form, parsed.data)
    : { status: "error", message: parsed.error.issues[0].message };
}
export async function saveStudySession(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const parsed = z
    .object({
      subject_id: z.uuid(),
      studied_on: dateInput,
      minutes: integer(1440),
      notes: z.string().max(2000),
      is_deleted: z.boolean(),
    })
    .safeParse({
      subject_id: field(form, "subject_id"),
      studied_on: field(form, "studied_on"),
      minutes: field(form, "minutes"),
      notes: field(form, "notes"),
      is_deleted: field(form, "is_deleted") === "true",
    });
  return parsed.success
    ? saveEntry("save_study_session", form, parsed.data)
    : { status: "error", message: parsed.error.issues[0].message };
}
export async function saveStudyGoal(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase } = await requireOnboardedAccount();
  const parsed = z
    .object({
      start: weekInput,
      area_id: z.uuid(),
      title,
      target: integer(10080),
      objective_id: nullableId,
      state: z.enum(["ACTIVE", "CANCELLED"]),
      id: nullableId,
    })
    .safeParse({
      start: field(form, "start"),
      area_id: field(form, "area_id"),
      title: field(form, "title"),
      target: field(form, "target"),
      objective_id: field(form, "objective_id"),
      state: field(form, "state"),
      id: field(form, "goal_id"),
    });
  if (!parsed.success)
    return { status: "error", message: parsed.error.issues[0].message };
  const { start, area_id, id, ...goal } = parsed.data;
  const { error } = await supabase.rpc("save_study_goal", {
    p_start_date: start,
    p_area_id: area_id,
    p_goal_id: id,
    p_goal: {
      ...goal,
      target: String(goal.target),
      expected_updated_at: field(form, "expected"),
    },
  });
  if (error) return failure(error.code);
  revalidatePath("/", "layout");
  return { status: "success", message: "Meta salva." };
}
