"use client";
import { useActionState, useEffect, useState, type ReactNode } from "react";
import { INITIAL_STATE, type ActionState } from "@/types/actions";
import type { Objective } from "@/features/planning/types";
import type { OwnedEntry } from "@/features/studies/types";
export function EntryForm({
  action,
  areaId,
  item,
  onSaved,
  children,
  label = "Salvar",
}: {
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  areaId: string;
  item?: OwnedEntry;
  onSaved: () => void;
  children: ReactNode;
  label?: string;
}) {
  const [state, submit, pending] = useActionState(action, INITIAL_STATE);
  const [id] = useState(() => item?.id || crypto.randomUUID());
  useEffect(() => {
    if (state.status === "success") onSaved();
  }, [state, onSaved]);
  return (
    <form
      action={submit}
      className="stack"
      onReset={(event) => event.preventDefault()}
    >
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="area_id" value={areaId} />
      <input type="hidden" name="expected" value={item?.updated_at || ""} />
      <fieldset disabled={pending} className="specialized-fields">
        {children}
      </fieldset>
      <p className="form-message error" role="alert">
        {state.status === "error" ? state.message : ""}
      </p>
      <button className="button primary" disabled={pending}>
        {pending ? "Salvando…" : label}
      </button>
    </form>
  );
}
export function Field({
  label,
  defaultValue,
  onChange,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <label className="field">
      {label}
      <input
        {...props}
        value={props.value ?? value}
        onChange={(e) => {
          setValue(e.target.value);
          onChange?.(e);
        }}
      />
    </label>
  );
}
export function Select({
  label,
  children,
  defaultValue,
  onChange,
  ...props
}: {
  label: string;
  children: ReactNode;
} & React.SelectHTMLAttributes<HTMLSelectElement>) {
  const [value, setValue] = useState(defaultValue ?? "");
  return (
    <label className="field">
      {label}
      <select
        {...props}
        value={props.value ?? value}
        onChange={(e) => {
          setValue(e.target.value);
          onChange?.(e);
        }}
      >
        {children}
      </select>
    </label>
  );
}
export function ObjectiveField({
  objectives,
  areaId,
  value,
}: {
  objectives: Objective[];
  areaId: string;
  value?: string | null;
}) {
  return (
    <Select
      label="Objetivo relacionado"
      name="objective_id"
      defaultValue={value || ""}
    >
      <option value="">Sem objetivo</option>
      {objectives
        .filter((o) => !o.area_id || o.area_id === areaId)
        .map((o) => (
          <option key={o.id} value={o.id}>
            {o.title}
          </option>
        ))}
    </Select>
  );
}
