"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireOnboardedAccount } from "@/server/repositories/account";
import { validDate } from "@/lib/dates/weeks";
import type { ActionState } from "@/types/actions";

const optionalId = z.union([z.uuid(), z.literal("")]);
const schema = z
  .object({
    area_id: z.uuid(),
    title: z.string().trim().min(1).max(160),
    book_id: optionalId,
    objective_id: optionalId,
    due_on: z.string().refine((v) => !v || validDate(v)),
    due_time: z.string().regex(/^$|^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/),
    completed: z.boolean(),
  })
  .refine((v) => !v.due_time || !!v.due_on);
function failure(code?: string): ActionState {
  return {
    status: "error",
    message:
      code === "40001"
        ? "Esta ação mudou. Recarregue a página antes de tentar novamente."
        : "Não foi possível salvar a ação. Confira os dados e tente novamente.",
  };
}
export async function saveAreaAction(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase } = await requireOnboardedAccount();
  const parsed = schema.safeParse({
    ...Object.fromEntries(form),
    completed: form.get("completed") === "true",
  });
  const id = z.uuid().safeParse(form.get("id"));
  const expected = String(form.get("expected_updated_at") || "");
  if (
    !parsed.success ||
    !id.success ||
    (expected && !z.iso.datetime({ offset: true }).safeParse(expected).success)
  )
    return failure();
  const { error } = await supabase.rpc("save_area_action", {
    p_action: parsed.data,
    p_action_id: id.data,
    p_expected_updated_at: expected || null,
  });
  if (error) return failure(error.code);
  revalidatePath("/", "layout");
  return { status: "success", message: "Ação salva." };
}
export async function completeAreaAction(
  id: string,
  completed: boolean,
  expected: string,
): Promise<ActionState> {
  const { supabase } = await requireOnboardedAccount();
  if (
    !z.uuid().safeParse(id).success ||
    typeof completed !== "boolean" ||
    !z.iso.datetime({ offset: true }).safeParse(expected).success
  )
    return failure();
  const { error } = await supabase.rpc("complete_area_action", {
    p_action_id: id,
    p_completed: completed,
    p_expected_updated_at: expected,
  });
  if (error) return failure(error.code);
  revalidatePath("/", "layout");
  return {
    status: "success",
    message: completed ? "Ação concluída." : "Ação reaberta.",
  };
}
