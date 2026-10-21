"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireOnboardedAccount } from "@/server/repositories/account";
import { profileSchema } from "./schema";
import type { ActionState } from "@/types/actions";
export async function signInWithGoogle() {
  const origin = process.env.NEXT_PUBLIC_APP_URL;
  if (!origin) redirect("/entrar?erro=configuracao");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: new URL("/auth/callback", origin).toString(),
      scopes: "openid email profile",
    },
  });
  if (error || !data.url) redirect("/entrar?erro=autenticacao");
  redirect(data.url);
}
export async function signOut() {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error("Não foi possível sair. Tente novamente.");
  revalidatePath("/", "layout");
  redirect("/entrar");
}
export async function saveProfile(
  _: ActionState,
  form: FormData,
): Promise<ActionState> {
  const { supabase, user } = await requireOnboardedAccount();
  const parsed = profileSchema.safeParse({
    display_name: form.get("display_name"),
    timezone: form.get("timezone"),
  });
  if (!parsed.success)
    return { status: "error", message: parsed.error.issues[0].message };
  const { error } = await supabase
    .from("profiles")
    .update(parsed.data)
    .eq("user_id", user.id);
  if (error)
    return {
      status: "error",
      message: "Não foi possível salvar seu perfil. Tente novamente.",
    };
  revalidatePath("/", "layout");
  return { status: "success", message: "Perfil atualizado." };
}
