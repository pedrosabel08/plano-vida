import "server-only";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireOnboardedAccount } from "@/server/repositories/account";
import type { ActionState } from "@/types/actions";
import type { EntryRpc } from "@/types/specialized-rpcs";
import type { Json } from "@/types/database";
export const field = (form: FormData, key: string) =>
  String(form.get(key) ?? "");
export const title = z.string().trim().min(1, "Informe o título.").max(160);
export const nullableId = z
  .union([z.uuid(), z.literal("")])
  .transform((v) => v || null);
export const integer = (max = 1000000) =>
  z.coerce.number().int().min(1).max(max);
export const failure = (code?: string): ActionState => ({
  status: "error",
  message:
    code === "40001"
      ? "Os dados mudaram. Recarregue antes de editar."
      : code === "22023"
        ? "Esta operação já foi utilizada com outros dados. Reabra o formulário."
        : "Não foi possível salvar. Confira valores, datas e vínculos e tente novamente.",
});
export async function saveEntry(
  rpc: EntryRpc,
  form: FormData,
  payload: Record<string, unknown>,
): Promise<ActionState> {
  const { supabase } = await requireOnboardedAccount();
  const ids = z
    .object({
      id: z.uuid(),
      area_id: z.uuid(),
      expected: z.string().refine((v) => !v || !Number.isNaN(Date.parse(v))),
    })
    .safeParse({
      id: field(form, "id"),
      area_id: field(form, "area_id"),
      expected: field(form, "expected"),
    });
  if (!ids.success) return failure();
  const { error } = await supabase.rpc(rpc, {
    p_id: ids.data.id,
    p_expected: ids.data.expected || null,
    p_item: { ...payload, area_id: ids.data.area_id } as Json,
  });
  if (error) return failure(error.code);
  revalidatePath("/", "layout");
  return { status: "success", message: "Salvo." };
}
