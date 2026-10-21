import { redirect } from "next/navigation";
import { ArrowRight, Check, Sprout } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { getSupabaseConfig } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import { signInWithGoogle } from "@/features/auth/actions";
export const metadata = { title: "Entrar" };
export const dynamic = "force-dynamic";
export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const configured = !!getSupabaseConfig() && !!process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/inicio");
  }
  const params = await searchParams;
  return (
    <main className="auth-page">
      <div className="auth-top">
        <Brand />
        <span className="auth-top-label">SEU PLANO. SUA VIDA.</span>
      </div>
      <div className="auth-content">
        <section className="auth-story">
          <span className="eyebrow">UM ESPAÇO PARA O QUE IMPORTA</span>
          <h1>
            O próximo capítulo
            <br />
            começa com
            <br />
            <em>intenção.</em>
          </h1>
          <p>
            Organize as áreas da sua vida.
            <br />
            Construa um caminho que faça sentido para você.
          </p>
          <div className="auth-values">
            <span>
              <Check size={15} />
              Pessoal
            </span>
            <span>
              <Check size={15} />
              Flexível
            </span>
            <span>
              <Check size={15} />
              Seu
            </span>
          </div>
        </section>
        <section className="login-card">
          <span className="login-mark">
            <Sprout size={32} strokeWidth={1.5} />
          </span>
          <h2>Bem-vindo ao seu espaço.</h2>
          <p>Entre para começar seu Plano de Vida.</p>
          {!configured ? (
            <div className="inline-alert" role="status">
              A conexão com sua conta ainda não está disponível. Tente novamente
              mais tarde.
            </div>
          ) : null}
          {params.erro && (
            <p role="alert" className="inline-alert error">
              Não foi possível entrar. Tente novamente.
            </p>
          )}
          <form action={signInWithGoogle}>
            <button
              className="button google-button full-width"
              disabled={!configured}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  fill="currentColor"
                  d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.2c1.9-1.8 3-4.3 3-7.5ZM12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a6 6 0 0 1-5.6-4.2H3.1v2.6A10 10 0 0 0 12 22ZM6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.1a10 10 0 0 0 0 9l3.3-2.6ZM12 5.9c1.5 0 2.8.5 3.9 1.5l2.9-2.9A9.5 9.5 0 0 0 12 2a10 10 0 0 0-8.9 5.5l3.3 2.6A6 6 0 0 1 12 5.9Z"
                />
              </svg>
              Continuar com Google
              <ArrowRight size={17} />
            </button>
          </form>
          <div className="login-separator" />
          <p className="login-privacy">
            Um plano pessoal, com dados vinculados à sua conta.
          </p>
        </section>
      </div>
      <footer className="auth-footer">
        Uma vida com intenção. Um dia de cada vez.
      </footer>
    </main>
  );
}
