import "server-only";
import { requireOnboardedAccount } from "./account";
import type { StudiesData } from "@/features/studies/types";
export async function getStudies(areaId: string) {
  const { supabase } = await requireOnboardedAccount();
  const { data, error } = await supabase.rpc("get_studies_data", {
    p_area_id: areaId,
  });
  if (error)
    throw new Error(
      "Não foi possível carregar Estudos. Confira a atualização do banco.",
    );
  return data as unknown as StudiesData;
}
