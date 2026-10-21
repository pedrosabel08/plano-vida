"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/server/repositories/account";
import { profileSchema } from "@/features/auth/schema";
import { SUGGESTED_AREAS } from "@/features/areas/constants";
import type { ActionState } from "@/types/actions";
export async function finishOnboarding(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase, profile } = await requireAccount();
  if (profile.onboarding_completed_at) redirect("/inicio");
  const parsed = profileSchema.safeParse({
    display_name: form.get("display_name"),
    timezone: form.get("timezone"),
  });
  if (!parsed.success)
    return { status: "error", message: parsed.error.issues[0].message };
  const selected = form.getAll("suggestion");
  if (
    selected.some(
      (value) => typeof value !== "string" || !/^0?[0-4]$/.test(value),
    )
  )
    return { status: "error", message: "Selecione áreas válidas." };
  const areas = SUGGESTED_AREAS.filter((_, index) =>
    selected.includes(String(index)),
  ).map((area) => ({ ...area }));
  const { error } = await supabase.rpc("complete_onboarding", {
    p_display_name: parsed.data.display_name,
    p_timezone: parsed.data.timezone,
    p_areas: areas,
  });
  if (error)
    return {
      status: "error",
      message:
        "Não foi possível concluir. Confira a conexão e tente novamente.",
    };
  revalidatePath("/", "layout");
  redirect("/inicio");
}
