import "server-only";
import { cache } from "react";
import { requireOnboardedAccount } from "./account";
import type { AreaAction, AreaActionsData } from "@/features/actions/types";

export const getAreaActions = cache(
  async (areaId: string): Promise<AreaActionsData> => {
    const { supabase } = await requireOnboardedAccount();
    const { data, error } = await supabase.rpc("get_area_actions", {
      p_area_id: areaId,
    });
    if (error)
      return {
        items: [],
        error:
          "Não foi possível carregar as ações. Tente novamente. Se o problema persistir, verifique a atualização do banco.",
      };
    return { items: data as unknown as AreaAction[] };
  },
);
