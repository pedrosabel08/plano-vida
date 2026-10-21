"use client";
import { useActionState, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Target } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { PageHeading } from "@/components/ui/page-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { saveObjective, deleteObjective } from "@/features/planning/actions";
import { INITIAL_STATE } from "@/types/actions";
import type { Area } from "@/types/database";
import type { Objective } from "@/features/planning/types";
import {
  decimal,
  divide,
  multiply,
  HUNDRED,
} from "@/domain/performance/fraction";
import { formatValue, formatPercent } from "@/lib/formatting/performance";
function ObjectiveForm({
  objective,
  areas,
  onSaved,
}: {
  objective?: Objective;
  areas: Area[];
  onSaved: (message: string) => void;
}) {
  const [state, action, pending] = useActionState(saveObjective, INITIAL_STATE);
  const [type, setType] = useState(objective?.type || "QUALITATIVE");
  useEffect(() => {
    if (state.status === "success") onSaved(state.message || "Objetivo salvo.");
  }, [state, onSaved]);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="id" value={objective?.id || ""} />
      <input
        type="hidden"
        name="expected_updated_at"
        value={objective?.updated_at || ""}
      />
      <label className="field">
        Título do objetivo
        <input
          name="title"
          defaultValue={objective?.title}
          maxLength={160}
          required
          placeholder="Ex.: Ler mais"
        />
      </label>
      <label className="field">
        Área do objetivo
        <select name="area_id" defaultValue={objective?.area_id || ""}>
          <option value="">Sem área específica</option>
          {areas.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        Tipo de objetivo
        <select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as Objective["type"])}
        >
          <option value="QUALITATIVE">Qualitativo</option>
          <option value="QUANTITATIVE">Mensurável</option>
          <option value="PERCENTAGE">Percentual</option>
        </select>
      </label>
      {type !== "QUALITATIVE" && (
        <>
          <div className="form-grid">
            <label className="field">
              Progresso atual
              <input
                name="current_value"
                inputMode="decimal"
                defaultValue={objective?.current_value || "0"}
                required
              />
            </label>
            {type === "QUANTITATIVE" && (
              <label className="field">
                Alvo do objetivo
                <input
                  name="target"
                  inputMode="decimal"
                  defaultValue={objective?.target || ""}
                  required
                />
              </label>
            )}
          </div>
          {type === "QUANTITATIVE" && (
            <label className="field">
              Unidade do objetivo
              <input
                name="unit"
                defaultValue={objective?.unit || ""}
                maxLength={40}
                required
                placeholder="Ex.: livros"
              />
            </label>
          )}
          <p className="field-help">
            O progresso é atualizado por você, sem depender das metas semanais.
          </p>
        </>
      )}
      <div className="form-grid">
        <label className="field">
          Prazo opcional
          <input
            type="date"
            name="due_date"
            defaultValue={objective?.due_date || ""}
          />
        </label>
        <label className="field">
          Situação do objetivo
          <select name="state" defaultValue={objective?.state || "ACTIVE"}>
            <option value="ACTIVE">Em andamento</option>
            <option value="COMPLETED">Concluído</option>
          </select>
        </label>
      </div>
      <p role="alert" className="form-message error">
        {state.message}
      </p>
      <button className="button primary full-width" disabled={pending}>
        {pending ? "Salvando…" : "Salvar objetivo"}
      </button>
    </form>
  );
}
function DeleteForm({
  objective,
  onSaved,
}: {
  objective: Objective;
  onSaved: (message: string) => void;
}) {
  const [state, action, pending] = useActionState(
    deleteObjective,
    INITIAL_STATE,
  );
  useEffect(() => {
    if (state.status === "success")
      onSaved(state.message || "Objetivo removido.");
  }, [state, onSaved]);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="id" value={objective.id} />
      <p className="muted">
        Excluir “{objective.title}”? Objetivos vinculados a metas precisam ser
        desvinculados antes. Esta ação não pode ser desfeita.
      </p>
      <p role="alert" className="form-message error">
        {state.message}
      </p>
      <button className="button danger" disabled={pending}>
        Confirmar exclusão do objetivo
      </button>
    </form>
  );
}
export function ObjectiveManager({
  objectives,
  areas,
}: {
  objectives: Objective[];
  areas: Area[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState<Objective | "new" | null>(null);
  const [removing, setRemoving] = useState<Objective | null>(null);
  const [notice, setNotice] = useState("");
  const onSaved = useCallback(
    (message: string) => {
      setEditing(null);
      setRemoving(null);
      setNotice(message);
      router.refresh();
    },
    [router],
  );
  return (
    <>
      <PageHeading
        eyebrow="DIREÇÃO PARA O SEU CAMINHO"
        title="Objetivos"
        description="Resultados que você quer construir, além de uma semana."
        action={
          <button className="button primary" onClick={() => setEditing("new")}>
            <Plus size={17} />
            Novo objetivo
          </button>
        }
      />
      <div role="status" className="live-notice">
        {notice}
      </div>
      {objectives.length ? (
        <div className="objective-grid">
          {objectives.map((o) => (
            <article key={o.id} className="panel objective-card">
              <div className="objective-top">
                <span className="note-icon">
                  <Target size={22} />
                </span>
                <span className="pill">
                  {o.state === "COMPLETED" ? "Concluído" : "Em andamento"}
                </span>
              </div>
              <h2>{o.title}</h2>
              <p className="objective-area">
                {areas.find((a) => a.id === o.area_id)?.name ||
                  "Sem área específica"}
              </p>
              {o.type === "QUALITATIVE" ? (
                <p className="muted">Objetivo qualitativo</p>
              ) : (
                <div className="objective-value">
                  <strong>{formatValue(decimal(o.current_value!))}</strong> /{" "}
                  {formatValue(decimal(o.target!))} {o.unit}
                  <span>
                    {formatPercent(
                      multiply(
                        divide(decimal(o.current_value!), decimal(o.target!)),
                        HUNDRED,
                      ),
                    )}
                  </span>
                </div>
              )}
              {o.due_date && (
                <p className="field-help">
                  Prazo:{" "}
                  {new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
                    new Date(o.due_date + "T12:00:00Z"),
                  )}
                </p>
              )}
              <div className="objective-footer">
                <button
                  className="button secondary"
                  onClick={() => setEditing(o)}
                >
                  <Pencil size={14} />
                  Editar objetivo
                </button>
                <button
                  className="small-icon-button delete-button"
                  aria-label={"Excluir objetivo " + o.title}
                  onClick={() => setRemoving(o)}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EmptyState title="Uma direção para começar">
          Crie seu primeiro objetivo. Ele pode ter números, um prazo ou apenas
          uma intenção clara.
        </EmptyState>
      )}
      {editing && (
        <Modal
          title={editing === "new" ? "Novo objetivo" : "Editar objetivo"}
          onClose={() => setEditing(null)}
        >
          <ObjectiveForm
            objective={editing === "new" ? undefined : editing}
            areas={areas}
            onSaved={onSaved}
          />
        </Modal>
      )}
      {removing && (
        <Modal title="Excluir objetivo?" onClose={() => setRemoving(null)}>
          <DeleteForm objective={removing} onSaved={onSaved} />
        </Modal>
      )}
    </>
  );
}
