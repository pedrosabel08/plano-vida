import "server-only";
import { requireOnboardedAccount } from "./account";
import type { CareerData } from "@/features/career/types";
export async function getCareer(areaId: string) {
  const { supabase } = await requireOnboardedAccount();
  const { data, error } = await supabase.rpc("get_career_data", {
    p_area_id: areaId,
  });
  if (error)
    throw new Error(
      "Não foi possível carregar Carreira. Confira a atualização do banco.",
    );
  return data as unknown as CareerData;
}
