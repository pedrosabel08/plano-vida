import "server-only";
import { requireOnboardedAccount } from "./account";
import type { FinanceData } from "@/features/finances/types";
export async function getFinances(areaId: string) {
  const { supabase } = await requireOnboardedAccount();
  const { data, error } = await supabase.rpc("get_finance_data", {
    p_area_id: areaId,
  });
  if (error)
    throw new Error(
      "Não foi possível carregar Finanças. Confira a atualização do banco.",
    );
  return data as unknown as FinanceData;
}
