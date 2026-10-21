"use client";
import { useActionState } from "react";
import { saveProfile } from "./actions";
import { INITIAL_STATE } from "@/types/actions";
import type { Profile } from "@/types/database";
export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action, pending] = useActionState(saveProfile, INITIAL_STATE);
  return (
    <form action={action} className="stack">
      <label className="field">
        Como prefere ser chamado
        <input
          name="display_name"
          defaultValue={profile.display_name}
          maxLength={80}
          required
          autoComplete="given-name"
        />
      </label>
      <div className="field">
        <label htmlFor="profile-timezone">Fuso horário</label>
        <input
          id="profile-timezone"
          name="timezone"
          defaultValue={profile.timezone}
          required
          list="timezones"
          spellCheck={false}
          aria-describedby="timezone-help"
        />
        <span id="timezone-help" className="field-help">
          Usado para datas e horários do seu plano.
        </span>
      </div>
      <datalist id="timezones">
        {[
          "America/Sao_Paulo",
          "America/Manaus",
          "America/Recife",
          "America/Fortaleza",
          "America/Belem",
          "America/Cuiaba",
          "America/Rio_Branco",
          "America/Noronha",
          "Europe/Lisbon",
          "UTC",
        ].map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
      <p
        role="status"
        className={
          state.status === "error"
            ? "form-message error"
            : "form-message success"
        }
      >
        {state.message}
      </p>
      <div>
        <button className="button primary" disabled={pending}>
          {pending ? "Salvando…" : "Salvar alterações"}
        </button>
      </div>
    </form>
  );
}
