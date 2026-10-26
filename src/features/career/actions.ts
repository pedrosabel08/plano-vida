"use server";
import { z } from "zod";
import { dateInput } from "@/features/planning/schema";
import {
  field,
  title,
  nullableId,
  integer,
  saveEntry,
} from "@/features/specialized/mutation";
import type { ActionState } from "@/types/actions";
const optionalDate = z
  .union([dateInput, z.literal("")])
  .transform((v) => v || null);
export async function saveCareerProject(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const p = z
    .object({
      title,
      kind: z.enum(["WORK", "DEVELOPMENT"]),
      due_on: optionalDate,
      objective_id: nullableId,
      status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED"]),
    })
    .safeParse({
      title: field(form, "title"),
      kind: field(form, "kind"),
      due_on: field(form, "due_on"),
      objective_id: field(form, "objective_id"),
      status: field(form, "status"),
    });
  return p.success
    ? saveEntry("save_career_project", form, p.data)
    : { status: "error", message: p.error.issues[0].message };
}
export async function saveCareerMilestone(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const p = z
    .object({
      project_id: z.uuid(),
      title,
      kind: z.enum(["TASK", "MILESTONE", "LESSON", "DELIVERY"]),
      due_on: optionalDate,
      completed_on: optionalDate,
      is_deleted: z.boolean(),
    })
    .safeParse({
      project_id: field(form, "project_id"),
      title: field(form, "title"),
      kind: field(form, "kind"),
      due_on: field(form, "due_on"),
      completed_on: field(form, "completed_on"),
      is_deleted: field(form, "is_deleted") === "true",
    });
  return p.success
    ? saveEntry("save_career_milestone", form, p.data)
    : { status: "error", message: p.error.issues[0].message };
}
export async function saveCareerCommitment(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const p = z
    .object({
      project_id: nullableId,
      title,
      kind: z.enum(["MEETING", "DELIVERY"]),
      due_on: dateInput,
      completed_on: optionalDate,
      is_deleted: z.boolean(),
    })
    .safeParse({
      project_id: field(form, "project_id"),
      title: field(form, "title"),
      kind: field(form, "kind"),
      due_on: field(form, "due_on"),
      completed_on: field(form, "completed_on"),
      is_deleted: field(form, "is_deleted") === "true",
    });
  return p.success
    ? saveEntry("save_career_commitment", form, p.data)
    : { status: "error", message: p.error.issues[0].message };
}
export async function saveCareerSettings(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const p = z
    .object({
      study_area_id: nullableId,
      study_target_minutes: z
        .union([integer(10080), z.literal("")])
        .transform((v) => (v === "" ? null : v)),
      objective_id: nullableId,
    })
    .safeParse({
      study_area_id: field(form, "study_area_id"),
      study_target_minutes: field(form, "study_target_minutes"),
      objective_id: field(form, "objective_id"),
    });
  return p.success
    ? saveEntry("save_career_setting", form, p.data)
    : { status: "error", message: p.error.issues[0].message };
}
export async function saveCareerReview(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const p = z
    .object({
      reviewed_on: dateInput,
      wins: z
        .string()
        .trim()
        .min(1, "Registre uma conquista ou observação.")
        .max(4000),
      lessons: z.string().max(4000),
      next_steps: z.string().max(4000),
    })
    .safeParse({
      reviewed_on: field(form, "reviewed_on"),
      wins: field(form, "wins"),
      lessons: field(form, "lessons"),
      next_steps: field(form, "next_steps"),
    });
  return p.success
    ? saveEntry("save_career_review", form, p.data)
    : { status: "error", message: p.error.issues[0].message };
}
