"use server";
import { revalidatePath } from "next/cache";
import { requireOnboardedAccount } from "@/server/repositories/account";
import { areaIdSchema, areaSchema, reorderSchema } from "./schema";
import type { ActionState } from "@/types/actions";
export async function saveArea(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireOnboardedAccount();
  const parsed = areaSchema.safeParse({
    name: form.get("name"),
    icon: form.get("icon"),
    color: form.get("color"),
  });
  if (!parsed.success)
    return { status: "error", message: parsed.error.issues[0].message };
  const id = form.get("id");
  if (id) {
    const validId = areaIdSchema.safeParse(id);
    if (!validId.success) return { status: "error", message: "Área inválida." };
    const { data, error } = await supabase
      .from("areas")
      .update(parsed.data)
      .eq("user_id", user.id)
      .eq("id", validId.data)
      .select("id")
      .single();
    if (error || !data)
      return {
        status: "error",
        message:
          "Não foi possível editar. Atualize a página e tente novamente.",
      };
  } else {
    const { error } = await supabase.rpc("create_area", {
      p_name: parsed.data.name,
      p_icon: parsed.data.icon,
      p_color: parsed.data.color,
    });
    if (error)
      return {
        status: "error",
        message: "Não foi possível criar a área. Tente novamente.",
      };
  }
  revalidatePath("/", "layout");
  return {
    status: "success",
    message: id ? "Área atualizada." : "Área criada.",
  };
}
export async function deleteArea(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireOnboardedAccount();
  const parsed = areaIdSchema.safeParse(form.get("id"));
  if (!parsed.success) return { status: "error", message: "Área inválida." };
  const { data, error } = await supabase
    .from("areas")
    .delete()
    .eq("user_id", user.id)
    .eq("id", parsed.data)
    .select("id")
    .single();
  if (error || !data)
    return {
      status: "error",
      message:
        "Não foi possível remover. A área pode possuir objetivos ou planejamento vinculados.",
    };
  revalidatePath("/", "layout");
  return { status: "success", message: "Área removida." };
}
export async function reorderAreas(ids: string[]): Promise<ActionState> {
  const { supabase } = await requireOnboardedAccount();
  const parsed = reorderSchema.safeParse(ids);
  if (!parsed.success) return { status: "error", message: "Ordem inválida." };
  const { error } = await supabase.rpc("reorder_areas", { p_ids: parsed.data });
  if (error)
    return {
      status: "error",
      message: "A lista pode ter mudado. Atualize a página e tente novamente.",
    };
  revalidatePath("/", "layout");
  return { status: "success", message: "Ordem atualizada." };
}
