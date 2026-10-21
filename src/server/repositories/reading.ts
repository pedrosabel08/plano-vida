import "server-only";
import { cache } from "react";
import { requireOnboardedAccount, getAreas } from "./account";
import type { ReadingData } from "@/features/reading/types";
export const getReading = cache(async (areaId: string) => {
  const { supabase, profile } = await requireOnboardedAccount();
  const areas = await getAreas();
  const area = areas.find((a) => a.id === areaId);
  if (!area) return null;
  const { data, error } = await supabase.rpc("get_reading_data", {
    p_area_id: areaId,
  });
  if (error)
    throw new Error(
      "Não foi possível carregar a biblioteca. Confira a migration de Leitura.",
    );
  return { area, profile, data: data as unknown as ReadingData };
});
