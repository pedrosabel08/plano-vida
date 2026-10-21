import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/env";
export const requireAccount = cache(async () => {
  if (!getSupabaseConfig()) redirect("/entrar");
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) redirect("/entrar");
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();
  if (profileError || !profile)
    throw new Error(
      "Não foi possível carregar seu perfil. Confira a conexão e a migration da Fundação.",
    );
  return { supabase, user, profile };
});
export const requireOnboardedAccount = cache(async () => {
  const account = await requireAccount();
  if (!account.profile.onboarding_completed_at) redirect("/onboarding");
  return account;
});
export const getAreas = cache(async () => {
  const { supabase, user } = await requireOnboardedAccount();
  const { data, error } = await supabase
    .from("areas")
    .select("*")
    .eq("user_id", user.id)
    .order("sort_order")
    .order("id");
  if (error)
    throw new Error("Não foi possível carregar suas áreas. Tente novamente.");
  return data;
});
