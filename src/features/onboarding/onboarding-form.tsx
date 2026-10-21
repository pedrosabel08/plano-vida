"use client";
import { useActionState } from "react";
import { ArrowRight, Check } from "lucide-react";
import { finishOnboarding } from "./actions";
import { SUGGESTED_AREAS } from "@/features/areas/constants";
import { AreaIcon } from "@/components/ui/icon";
import { INITIAL_STATE } from "@/types/actions";
import type { Profile } from "@/types/database";
import type { CSSProperties } from "react";
export function OnboardingForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(
    finishOnboarding,
    INITIAL_STATE,
  );
  return (
    <form action={action} className="stack">
      <div className="onboarding-fields">
        <label className="field">
          Como prefere ser chamado
          <input
            name="display_name"
            defaultValue={profile.display_name}
            required
            maxLength={80}
            autoComplete="given-name"
            placeholder="Seu nome"
          />
        </label>
        <label className="field">
          Fuso horário
          <input
            name="timezone"
            defaultValue={profile.timezone}
            required
            spellCheck={false}
          />
        </label>
      </div>
      <fieldset className="suggestions">
        <legend>Quais áreas fazem sentido para você?</legend>
        <p>
          Selecione sugestões ou comece sem áreas. Você pode mudar tudo depois.
        </p>
        <div className="suggestion-list">
          {SUGGESTED_AREAS.map((area, index) => (
            <label
              key={area.name}
              className="suggestion"
              style={{ "--area-color": area.color } as CSSProperties}
            >
              <input type="checkbox" name="suggestion" value={index} />
              <span className="area-icon small">
                <AreaIcon name={area.icon} size={20} />
              </span>
              <span>{area.name}</span>
              <span className="suggestion-check">
                <Check size={14} />
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <p role="alert" className="form-message error">
        {state.message}
      </p>
      <button className="button primary full-width" disabled={pending}>
        {pending ? "Preparando seu espaço…" : "Começar meu plano"}
        <ArrowRight size={17} />
      </button>
      <p className="onboarding-footnote">
        Nenhum dado de exemplo será adicionado à sua conta.
      </p>
    </form>
  );
}
