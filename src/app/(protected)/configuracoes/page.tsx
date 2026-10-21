import { UserRound, Clock3, Moon, LogOut } from "lucide-react";
import { requireOnboardedAccount } from "@/server/repositories/account";
import { PageHeading } from "@/components/ui/page-heading";
import { ProfileForm } from "@/features/auth/profile-form";
import { signOut } from "@/features/auth/actions";
import { SensitiveText } from "@/components/privacy/privacy-provider";
export const metadata = { title: "Configurações" };
export default async function Settings() {
  const { profile, user } = await requireOnboardedAccount();
  return (
    <>
      <PageHeading
        eyebrow="DO SEU JEITO"
        title="Configurações"
        description="Ajuste os detalhes do seu espaço pessoal."
      />
      <div className="settings-grid">
        <section className="panel">
          <div className="panel-title">
            <UserRound size={20} />
            <h2>Seu perfil</h2>
          </div>
          <ProfileForm profile={profile} />
        </section>
        <div className="stack">
          <section className="panel">
            <div className="panel-title">
              <Moon size={20} />
              <h2>Aparência</h2>
            </div>
            <div className="setting-row">
              <span>Tema atual</span>
              <span className="pill">
                <Moon size={14} />
                Escuro
              </span>
            </div>
          </section>
          <section className="panel">
            <div className="panel-title">
              <Clock3 size={20} />
              <h2>Sua conta</h2>
            </div>
            <p className="muted account-email">
              <SensitiveText>{user.email}</SensitiveText>
            </p>
            <form action={signOut}>
              <button className="button secondary">
                <LogOut size={16} />
                Sair da conta
              </button>
            </form>
          </section>
        </div>
      </div>
    </>
  );
}
