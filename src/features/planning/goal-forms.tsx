"use client";
import type { AreaModule, ReadingBook } from "@/features/reading/types";
import type { GoalSource } from "./types";

import { useActionState, useEffect, useState } from "react";
import {
  saveWeeklyGoal,
  saveManualRecord,
  removeManualRecord,
} from "./actions";
import { INITIAL_STATE } from "@/types/actions";
import type { WeeklyGoal, GoalRecord, Objective } from "./types";
import type { GoalType } from "@/domain/performance/types";
import { addDays, todayInTimezone } from "@/lib/dates/weeks";
export const TYPE_LABELS: Record<GoalType, string> = {
  QUANTITY: "Quantidade",
  FREQUENCY: "Frequência",
  AVERAGE: "Média",
  COMPLETION: "Conclusão",
};
export function GoalForm({
  goal,
  areaId,
  start,
  objectives,
  locked,
  onSaved,
  readingModule,
  readingBooks = [],
  source,
  initialMeasurement = "MANUAL",
}: {
  initialMeasurement?: "MANUAL" | "MODULE";
  readingModule?: AreaModule;
  readingBooks?: ReadingBook[];
  source?: GoalSource;
  goal?: WeeklyGoal;
  areaId: string;
  start: string;
  objectives: Objective[];
  locked: boolean;
  onSaved: (message: string) => void;
}) {
  const [state, action, pending] = useActionState(
    saveWeeklyGoal,
    INITIAL_STATE,
  );
  const [measurement, setMeasurement] = useState(
    source?.kind || initialMeasurement,
  );
  const moduleSource = measurement === "MODULE";
  const moduleOnly =
    !goal && (source?.kind === "MODULE" || initialMeasurement === "MODULE");
  const [type, setType] = useState<GoalType>(goal?.type || "QUANTITY");
  useEffect(() => {
    if (state.status === "success") onSaved(state.message || "Meta salva.");
  }, [state, onSaved]);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="id" value={goal?.id || ""} />
      <input type="hidden" name="area_id" value={areaId} />
      <input type="hidden" name="start" value={start} />
      <input
        type="hidden"
        name="expected_updated_at"
        value={goal?.updated_at || ""}
      />
      <label className="field">
        Fonte da medição
        <select
          name="measurement_source"
          value={measurement}
          disabled={
            moduleOnly || locked || (!!goal && source?.kind === "MODULE")
          }
          onChange={(e) => {
            setMeasurement(e.target.value as "MANUAL" | "MODULE");
            if (e.target.value === "MODULE") setType("QUANTITY");
          }}
        >
          <option value="MANUAL">Registros manuais</option>
          {(readingModule?.enabled ||
            (!!goal && source?.kind === "MODULE")) && (
            <option value="MODULE">Leitura · páginas registradas</option>
          )}
        </select>
      </label>
      {(moduleOnly || locked || (!!goal && source?.kind === "MODULE")) && (
        <input type="hidden" name="measurement_source" value={measurement} />
      )}
      {!moduleSource && readingModule?.enabled && (
        <p className="field-help">
          Esta meta usa registros manuais. Para registrar leituras por livro,
          {locked
            ? " crie uma nova meta de leitura."
            : " selecione Leitura como fonte da medição."}
        </p>
      )}
      {moduleSource && (
        <>
          <label className="field">
            Escopo da leitura
            <select
              name="scope_book_id"
              defaultValue={source?.book_id || ""}
              disabled={!!goal && source?.kind === "MODULE"}
            >
              <option value="">Todos os livros desta área</option>
              {readingBooks
                .filter((b) => b.area_module_id === readingModule?.id)
                .map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
            </select>
          </label>
          {!!goal && source?.kind === "MODULE" && (
            <input
              type="hidden"
              name="scope_book_id"
              value={source.book_id || ""}
            />
          )}
          <p className="field-help">
            ReadingLog é a fonte canônica. Páginas iniciais e registros manuais
            não entram nesta medição. Para alterar o escopo após vincular, crie
            outra meta.
          </p>
        </>
      )}
      <label className="field">
        Título da meta
        <input
          name="title"
          defaultValue={goal?.title}
          maxLength={160}
          required
          placeholder="Ex.: Ler 70 páginas"
        />
      </label>
      <label className="field">
        Tipo da meta
        <select
          name="type"
          value={type}
          disabled={locked || moduleSource}
          onChange={(e) => setType(e.target.value as GoalType)}
        >
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {(locked || moduleSource) && (
        <input type="hidden" name="type" value={type} />
      )}
      <p className="field-help">
        {type === "QUANTITY"
          ? "Soma os valores registrados durante a semana."
          : type === "FREQUENCY"
            ? "Conta ocorrências na unidade que você definir."
            : type === "AVERAGE"
              ? "Usa as observações existentes e mostra a cobertura separadamente."
              : "A entrega está pendente ou concluída, sem progresso parcial."}
      </p>
      {type !== "COMPLETION" && (
        <div className="form-grid">
          <label className="field">
            Alvo da meta
            <input
              name="target"
              inputMode="decimal"
              defaultValue={goal?.target || ""}
              required
              placeholder={type === "AVERAGE" ? "8" : "70"}
            />
          </label>
          <label className="field">
            Unidade da meta
            <input
              name="unit"
              defaultValue={moduleSource ? "páginas" : goal?.unit || ""}
              disabled={locked || moduleSource}
              maxLength={40}
              required
              placeholder={
                type === "FREQUENCY"
                  ? "sessões"
                  : type === "AVERAGE"
                    ? "h"
                    : "páginas"
              }
            />
          </label>
          {(locked || moduleSource) && (
            <input
              type="hidden"
              name="unit"
              value={moduleSource ? "páginas" : goal?.unit}
            />
          )}
        </div>
      )}
      {(type === "QUANTITY" || type === "FREQUENCY") && (
        <label className="field">
          Base do alvo
          <select
            name="basis"
            disabled={locked}
            defaultValue={goal?.basis || "WEEKLY"}
          >
            <option value="WEEKLY">Total da semana</option>
            <option value="DAILY">Por dia, durante os sete dias</option>
          </select>
        </label>
      )}
      {locked && <input type="hidden" name="basis" value={goal?.basis} />}
      <p className="field-help">
        O alvo informado vale para esta semana. Não há redução automática pelos
        dias restantes.
      </p>
      {type === "FREQUENCY" && (
        <>
          <label className="field">
            Como contar a frequência
            <select
              name="frequency_mode"
              defaultValue={goal?.frequency_mode || "OCCURRENCES"}
              disabled={locked}
            >
              <option value="OCCURRENCES">Quantidade de ocorrências</option>
              <option value="DISTINCT_DAYS">Dias distintos com registro</option>
            </select>
          </label>
          {locked && (
            <input
              type="hidden"
              name="frequency_mode"
              value={goal?.frequency_mode}
            />
          )}
        </>
      )}
      {type === "AVERAGE" && (
        <div className="form-grid">
          <label className="field">
            Observações esperadas
            <input
              type="number"
              name="expected_observations"
              min={1}
              max={7}
              defaultValue={goal?.expected_observations || 7}
              required
            />
          </label>
          <label className="field">
            Unidade da cobertura
            <input
              name="observation_unit"
              defaultValue={goal?.observation_unit || "dias"}
              maxLength={40}
              required
              placeholder="Ex.: noites"
            />
          </label>
        </div>
      )}
      <label className="field">
        Objetivo relacionado
        <select name="objective_id" defaultValue={goal?.objective_id || ""}>
          <option value="">Sem objetivo relacionado</option>
          {objectives
            .filter((o) => !o.area_id || o.area_id === areaId)
            .map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
        </select>
      </label>
      <label className="field">
        Situação da meta
        <select name="state" defaultValue={goal?.state || "ACTIVE"}>
          <option value="ACTIVE">Ativa no planejamento</option>
          <option value="CANCELLED">Retirada do cálculo</option>
        </select>
      </label>
      {locked && (
        <p className="inline-alert">
          Esta meta já tem registros. Tipo, unidade e base são preservados. O
          alvo e o título continuam editáveis.
        </p>
      )}
      <p role="alert" className="form-message error">
        {state.message}
      </p>
      <button className="button primary full-width" disabled={pending}>
        {pending ? "Salvando…" : "Salvar meta semanal"}
      </button>
    </form>
  );
}
export function RecordForm({
  goal,
  record,
  start,
  timezone,
  onSaved,
}: {
  goal: WeeklyGoal;
  record?: GoalRecord;
  start: string;
  timezone: string;
  onSaved: (message: string) => void;
}) {
  const [state, action, pending] = useActionState(
    saveManualRecord,
    INITIAL_STATE,
  );
  const [operationId] = useState(
    () => record?.operation_id || crypto.randomUUID(),
  );
  const today = todayInTimezone(new Date(), timezone);
  const end = addDays(start, 6);
  const defaultDate = today < start ? start : today > end ? end : today;
  useEffect(() => {
    if (state.status === "success")
      onSaved(state.message || "Execução registrada.");
  }, [state, onSaved]);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="id" value={record?.id || ""} />
      <input type="hidden" name="goal_id" value={goal.id} />
      <input type="hidden" name="operation_id" value={operationId} />
      <input
        type="hidden"
        name="expected_updated_at"
        value={record?.updated_at || ""}
      />
      <p className="record-context">{goal.title}</p>
      <label className="field">
        Data da execução
        <input
          type="date"
          name="recorded_on"
          min={start}
          max={end}
          defaultValue={record?.recorded_on || defaultDate}
          required
        />
      </label>
      {goal.type === "COMPLETION" ? (
        <label className="completion-input">
          <input
            type="checkbox"
            name="completed"
            defaultChecked={record?.completed || false}
          />
          <span>Entrega concluída</span>
        </label>
      ) : goal.type === "FREQUENCY" &&
        goal.frequency_mode === "DISTINCT_DAYS" ? (
        <p className="muted">
          Este registro conta um dia. Vários registros da mesma data não
          aumentam a contagem de dias.
        </p>
      ) : (
        <label className="field">
          {goal.type === "AVERAGE" ? "Valor observado" : "Valor realizado"} (
          {goal.unit})
          <input
            name="value"
            inputMode={goal.type === "FREQUENCY" ? "numeric" : "decimal"}
            defaultValue={record?.value || ""}
            required
            placeholder={goal.type === "AVERAGE" ? "Ex.: 7,4" : "Ex.: 56"}
          />
        </label>
      )}
      {goal.type === "AVERAGE" && (
        <p className="field-help">
          Uma observação por dia. Para corrigir a mesma data, edite o registro
          existente. Dias sem registro não viram zero.
        </p>
      )}
      <p role="alert" className="form-message error">
        {state.message}
      </p>
      <button className="button primary full-width" disabled={pending}>
        {pending ? "Salvando…" : "Salvar execução"}
      </button>
    </form>
  );
}
export function RemoveRecordForm({
  record,
  onSaved,
}: {
  record: GoalRecord;
  onSaved: (message: string) => void;
}) {
  const [state, action, pending] = useActionState(
    removeManualRecord,
    INITIAL_STATE,
  );
  useEffect(() => {
    if (state.status === "success")
      onSaved(state.message || "Registro removido.");
  }, [state, onSaved]);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="id" value={record.id} />
      <input
        type="hidden"
        name="expected_updated_at"
        value={record.updated_at}
      />
      <p className="muted">
        Este registro deixará de participar do resultado operacional da semana.
      </p>
      <p role="alert" className="form-message error">
        {state.message}
      </p>
      <button className="button danger full-width" disabled={pending}>
        Confirmar remoção
      </button>
    </form>
  );
}
