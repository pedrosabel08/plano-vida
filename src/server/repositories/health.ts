import "server-only";
import { requireOnboardedAccount } from "./account";
import type { HealthData } from "@/features/health/types";
export async function getHealth(areaId: string) {
  const { supabase } = await requireOnboardedAccount();
  const { data, error } = await supabase.rpc("get_health_data", {
    p_area_id: areaId,
  });
  if (error)
    throw new Error(
      "Não foi possível carregar Sono e Saúde Bucal. Confira a atualização do banco.",
    );
  return data as unknown as HealthData;
}
