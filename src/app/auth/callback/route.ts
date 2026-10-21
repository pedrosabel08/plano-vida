import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { safeNextPath } from "@/features/auth/redirect";
export async function GET(request: NextRequest) {
  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  const code = request.nextUrl.searchParams.get("code");
  if (!code || !getSupabaseConfig())
    return NextResponse.redirect(new URL("/entrar?erro=autenticacao", origin));
  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  const response = NextResponse.redirect(
    new URL(
      error
        ? "/entrar?erro=autenticacao"
        : safeNextPath(request.nextUrl.searchParams.get("next")),
      origin,
    ),
  );
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
