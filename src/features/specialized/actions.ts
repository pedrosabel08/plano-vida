"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireOnboardedAccount } from "@/server/repositories/account";
import type { ActionState } from "@/types/actions";
export async function setAreaDashboard(
  areaId: string,
  dashboard: string,
): Promise<ActionState> {
  const { supabase } = await requireOnboardedAccount();
  if (
    !z.uuid().safeParse(areaId).success ||
    !z
      .enum(["leitura", "estudos", "financas", "carreira", "saude"])
      .safeParse(dashboard).success
  )
    return { status: "error", message: "Dashboard inválido." };
  const { error } = await supabase.rpc("set_area_dashboard", {
    p_area_id: areaId,
    p_dashboard: dashboard,
  });
  if (error)
    return {
      status: "error",
      message: "Não foi possível definir o dashboard inicial. Tente novamente.",
    };
  revalidatePath("/", "layout");
  return {
    status: "success",
    message: "Este dashboard será aberto ao entrar na área.",
  };
}
