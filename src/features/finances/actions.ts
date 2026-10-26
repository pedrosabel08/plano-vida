"use server";
import { z } from "zod";
import { dateInput } from "@/features/planning/schema";
import { parseCents } from "@/domain/finances/dashboard";
import {
  field,
  title,
  nullableId,
  saveEntry,
} from "@/features/specialized/mutation";
import type { ActionState } from "@/types/actions";
const amount = z.string().transform((v, ctx) => {
  try {
    return parseCents(v);
  } catch (e) {
    ctx.addIssue({ code: "custom", message: (e as Error).message });
    return z.NEVER;
  }
});
const optionalDate = z
  .union([dateInput, z.literal("")])
  .transform((v) => v || null);
export async function saveFinanceCategory(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const p = z
    .object({
      title,
      kind: z.enum(["INCOME", "EXPENSE"]),
      archived: z.boolean(),
    })
    .safeParse({
      title: field(form, "title"),
      kind: field(form, "kind"),
      archived: field(form, "archived") === "true",
    });
  return p.success
    ? saveEntry("save_finance_category", form, p.data)
    : { status: "error", message: p.error.issues[0].message };
}
export async function saveFinanceTransaction(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const p = z
    .object({
      category_id: z.uuid(),
      kind: z.enum(["INCOME", "EXPENSE"]),
      description: title,
      amount_cents: amount,
      booked_on: dateInput,
      status: z.enum(["PLANNED", "REALIZED"]),
      is_deleted: z.boolean(),
    })
    .safeParse({
      category_id: field(form, "category_id"),
      kind: field(form, "kind"),
      description: field(form, "description"),
      amount_cents: field(form, "amount"),
      booked_on: field(form, "booked_on"),
      status: field(form, "status"),
      is_deleted: field(form, "is_deleted") === "true",
    });
  return p.success
    ? saveEntry("save_finance_transaction", form, p.data)
    : { status: "error", message: p.error.issues[0].message };
}
export async function saveFinanceBudget(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const p = z
    .object({
      category_id: z.uuid(),
      month: dateInput.refine((v) => v.endsWith("-01")),
      limit_cents: amount,
    })
    .safeParse({
      category_id: field(form, "category_id"),
      month: field(form, "month") + "-01",
      limit_cents: field(form, "amount"),
    });
  return p.success
    ? saveEntry("save_finance_budget", form, p.data)
    : { status: "error", message: p.error.issues[0].message };
}
export async function saveFinanceGoal(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const p = z
    .object({
      title,
      target_cents: amount,
      due_on: optionalDate,
      objective_id: nullableId,
      archived: z.boolean(),
    })
    .safeParse({
      title: field(form, "title"),
      target_cents: field(form, "amount"),
      due_on: field(form, "due_on"),
      objective_id: field(form, "objective_id"),
      archived: field(form, "archived") === "true",
    });
  return p.success
    ? saveEntry("save_finance_goal", form, p.data)
    : { status: "error", message: p.error.issues[0].message };
}
export async function saveFinanceContribution(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const p = z
    .object({
      goal_id: z.uuid(),
      amount_cents: amount,
      recorded_on: dateInput,
      is_deleted: z.boolean(),
    })
    .safeParse({
      goal_id: field(form, "goal_id"),
      amount_cents: field(form, "amount"),
      recorded_on: field(form, "recorded_on"),
      is_deleted: field(form, "is_deleted") === "true",
    });
  return p.success
    ? saveEntry("save_finance_contribution", form, p.data)
    : { status: "error", message: p.error.issues[0].message };
}
