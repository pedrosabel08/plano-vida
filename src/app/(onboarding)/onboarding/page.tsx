import { redirect } from "next/navigation";
import { Brand } from "@/components/ui/brand";
import { requireAccount } from "@/server/repositories/account";
import { OnboardingForm } from "@/features/onboarding/onboarding-form";
export const dynamic = "force-dynamic";
export const metadata = { title: "Seu primeiro passo" };
export default async function Onboarding() {
  const { profile } = await requireAccount();
  if (profile.onboarding_completed_at) redirect("/inicio");
  return (
    <main className="onboarding-page">
      <Brand />
      <section className="onboarding-card">
        <span className="eyebrow">SEU PRIMEIRO PASSO</span>
        <h1>
          Vamos preparar
          <br />
          um espaço só seu.
        </h1>
        <p className="onboarding-intro">
          Você escolhe por onde começar. O resto pode ganhar forma com o tempo.
        </p>
        <OnboardingForm profile={profile} />
      </section>
    </main>
  );
}
