import type { ReactNode } from "react";
import { Sprout, ArrowUpRight } from "lucide-react";
import { Brand } from "@/components/ui/brand";
import { Navigation } from "@/components/navigation/navigation";
import {
  PrivacyProvider,
  PrivacyToggle,
} from "@/components/privacy/privacy-provider";
import { signOut } from "@/features/auth/actions";
import type { Profile } from "@/types/database";
export function AppShell({
  profile,
  children,
}: {
  profile: Profile;
  children: ReactNode;
}) {
  const date = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: profile.timezone,
  }).format(new Date());
  const firstName = profile.display_name.split(" ")[0] || "você";
  return (
    <PrivacyProvider>
      <a href="#main-content" className="skip-link">
        Pular para o conteúdo
      </a>
      <div className="app-shell">
        <aside className="sidebar">
          <Brand />
          <div className="nav-caption">MEU PLANO</div>
          <Navigation />
          <div className="sidebar-bottom">
            <div className="sidebar-note">
              <Sprout size={21} />
              <p>
                Uma vida com intenção.
                <br />
                <span>Um dia de cada vez.</span>
              </p>
            </div>
            <form action={signOut}>
              <button className="signout-button">
                Sair da conta
                <ArrowUpRight size={15} />
              </button>
            </form>
          </div>
        </aside>
        <div className="app-body">
          <header className="app-header">
            <div>
              <p className="header-greeting">
                Olá, {firstName}
                <span className="greeting-dot">.</span>
              </p>
              <p className="header-date">{date}</p>
            </div>
            <div className="header-actions">
              <PrivacyToggle />
              <span className="header-divider" />
              <span
                className="avatar"
                aria-label={"Perfil de " + profile.display_name}
              >
                {firstName[0]?.toUpperCase()}
              </span>
            </div>
          </header>
          <main id="main-content" className="page-container">
            {children}
          </main>
          <footer className="app-footer">
            <span>Plano de Vida</span>
            <span>Seu espaço para construir o que importa.</span>
          </footer>
        </div>
        <Navigation mobile />
      </div>
    </PrivacyProvider>
  );
}
