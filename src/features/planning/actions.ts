"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOnboardedAccount } from "@/server/repositories/account";
import { goalSchema, objectiveSchema, recordSchema, weekInput } from "./schema";
import type { ActionState } from "@/types/actions";
import type { Json } from "@/types/database";
function failure(error: { code?: string }): ActionState {
  const messages: Record<string, string> = {
    "23001": "Há dados vinculados. Desvincule antes de remover.",
    "23503":
      "Há dados vinculados ou um vínculo inválido. Desvincule antes de remover.",
    "23505":
      "Já existe uma observação para esse dia ou uma conclusão. Edite o registro existente.",
    "40001": "Os dados mudaram. Recarregue a página antes de editar.",
    "22023":
      "Não foi possível alterar a configuração de medição. Metas com registros preservam tipo, unidade e base.",
    "23514": "Confira o tipo, os valores, o período e os vínculos informados.",
  };
  return {
    status: "error",
    message:
      messages[error.code || ""] ||
      "Não foi possível salvar. Confira os dados e tente novamente.",
  };
}
const invalidate = () => revalidatePath("/", "layout");
const field = (form: FormData, key: string) => String(form.get(key) ?? "");
export async function saveObjective(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireOnboardedAccount();
  const type = field(form, "type");
  const parsed = objectiveSchema.safeParse({
    title: field(form, "title"),
    area_id: field(form, "area_id"),
    type,
    target:
      type === "QUALITATIVE"
        ? null
        : type === "PERCENTAGE"
          ? "100"
          : field(form, "target"),
    current_value: type === "QUALITATIVE" ? null : field(form, "current_value"),
    unit:
      type === "QUALITATIVE"
        ? null
        : type === "PERCENTAGE"
          ? "%"
          : field(form, "unit"),
    due_date: field(form, "due_date"),
    state: field(form, "state"),
  });
  if (!parsed.success)
    return { status: "error", message: parsed.error.issues[0].message };
  const id = field(form, "id");
  if (id) {
    if (!z.uuid().safeParse(id).success)
      return { status: "error", message: "Objetivo inválido." };
    const { data, error } = await supabase
      .from("objectives")
      .update(parsed.data)
      .eq("user_id", user.id)
      .eq("id", id)
      .eq("updated_at", field(form, "expected_updated_at"))
      .select("id")
      .single();
    if (error || !data) return failure(error || { code: "40001" });
  } else {
    const { error } = await supabase
      .from("objectives")
      .insert({ ...parsed.data, user_id: user.id })
      .select("id")
      .single();
    if (error) return failure(error);
  }
  invalidate();
  return { status: "success", message: "Objetivo salvo." };
}
export async function deleteObjective(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireOnboardedAccount();
  const id = field(form, "id");
  if (!z.uuid().safeParse(id).success)
    return { status: "error", message: "Objetivo inválido." };
  const { data, error } = await supabase
    .from("objectives")
    .delete()
    .eq("user_id", user.id)
    .eq("id", id)
    .select("id")
    .single();
  if (error || !data) return failure(error || {});
  invalidate();
  return { status: "success", message: "Objetivo removido." };
}
export async function saveWeeklyGoal(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase } = await requireOnboardedAccount();
  const type = field(form, "type");
  const parsed = goalSchema.safeParse({
    title: field(form, "title"),
    type,
    unit: type === "COMPLETION" ? "conclusão" : field(form, "unit"),
    target: type === "COMPLETION" ? "1" : field(form, "target"),
    basis:
      type === "AVERAGE" || type === "COMPLETION"
        ? "WEEKLY"
        : field(form, "basis"),
    frequency_mode:
      type === "FREQUENCY" ? field(form, "frequency_mode") : "OCCURRENCES",
    expected_observations:
      type === "AVERAGE" ? field(form, "expected_observations") : 7,
    observation_unit:
      type === "AVERAGE" ? field(form, "observation_unit") : "dias",
    objective_id: field(form, "objective_id"),
    state: field(form, "state"),
  });
  if (!parsed.success)
    return { status: "error", message: parsed.error.issues[0].message };
  const start = weekInput.safeParse(field(form, "start"));
  const area = z.uuid().safeParse(field(form, "area_id"));
  const id = field(form, "id");
  if (
    !start.success ||
    !area.success ||
    (id && !z.uuid().safeParse(id).success)
  )
    return { status: "error", message: "Área ou semana inválida." };
  const { error } = await supabase.rpc("save_weekly_goal", {
    p_start_date: start.data,
    p_area_id: area.data,
    p_goal: {
      ...parsed.data,
      expected_updated_at: field(form, "expected_updated_at"),
    },
    p_goal_id: id || null,
  });
  if (error) return failure(error);
  invalidate();
  return { status: "success", message: "Meta semanal salva." };
}
export async function saveManualRecord(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireOnboardedAccount();
  const goalId = field(form, "goal_id"),
    id = field(form, "id");
  if (
    !z.uuid().safeParse(goalId).success ||
    (id && !z.uuid().safeParse(id).success)
  )
    return { status: "error", message: "Registro inválido." };
  const { data: goal, error: goalError } = await supabase
    .from("weekly_goals")
    .select("type,frequency_mode")
    .eq("user_id", user.id)
    .eq("id", goalId)
    .single();
  if (goalError || !goal) return failure(goalError || {});
  const parsed = recordSchema.safeParse({
    recorded_on: field(form, "recorded_on"),
    value:
      goal.type === "COMPLETION"
        ? null
        : goal.type === "FREQUENCY" && goal.frequency_mode === "DISTINCT_DAYS"
          ? "1"
          : field(form, "value"),
    completed:
      goal.type === "COMPLETION" ? form.get("completed") === "on" : null,
    operation_id: field(form, "operation_id"),
  });
  if (!parsed.success)
    return { status: "error", message: parsed.error.issues[0].message };
  const { error } = await supabase.rpc("save_goal_record", {
    p_goal_id: goalId,
    p_record: {
      ...parsed.data,
      expected_updated_at: field(form, "expected_updated_at"),
    } as Json,
    p_record_id: id || null,
  });
  if (error) return failure(error);
  invalidate();
  return { status: "success", message: "Execução registrada." };
}
export async function removeManualRecord(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireOnboardedAccount();
  const id = field(form, "id");
  if (!z.uuid().safeParse(id).success)
    return { status: "error", message: "Registro inválido." };
  const { data, error } = await supabase
    .from("goal_records")
    .update({ is_deleted: true })
    .eq("user_id", user.id)
    .eq("id", id)
    .eq("updated_at", field(form, "expected_updated_at"))
    .select("id")
    .single();
  if (error || !data) return failure(error || { code: "40001" });
  invalidate();
  return { status: "success", message: "Registro removido do resultado." };
}
