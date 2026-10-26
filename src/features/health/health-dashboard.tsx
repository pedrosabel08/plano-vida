"use client";
import { useCallback, useState, useTransition } from "react";
import { Check, Moon, Smile } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { addDays } from "@/lib/dates/weeks";
import { healthDashboard, routineExpected } from "@/domain/health/dashboard";
import { localDateTime } from "@/domain/health/time";
import {
  DashboardFrame,
  Card,
  Metric,
  Bar,
  Bars,
  WeekControl,
  Actions,
  Empty,
  n,
  Objectives,
  type DashboardContext,
} from "@/features/specialized/ui";
import { EntryForm, Field, Select } from "@/features/specialized/forms";
import {
  saveHealthSettings,
  saveSleepLog,
  saveHealthRoutine,
  saveRoutineCheck,
} from "./actions";
import type {
  HealthData,
  HealthSettings,
  SleepLog,
  HealthRoutine,
  RoutineCheck,
} from "./types";
type Editor =
  | { kind: "night"; item?: SleepLog }
  | { kind: "settings"; item?: HealthSettings }
  | { kind: "routine"; item?: HealthRoutine; routineKind: "SLEEP" | "ORAL" };
function RoutineRow({
  routine,
  check,
  date,
  areaId,
  onEdit,
}: {
  routine: HealthRoutine;
  check?: RoutineCheck;
  date: string;
  areaId: string;
  onEdit: () => void;
}) {
  const [pending, transition] = useTransition(),
    [error, setError] = useState("");
  const [id] = useState(() => check?.id || crypto.randomUUID());
  return (
    <li>
      <div className="specialized-row">
        <button
          className={`specialized-check ${check?.completed ? "done" : ""}`}
          aria-label={`${check?.completed ? "Desmarcar" : "Concluir"} ${routine.title}`}
          aria-pressed={check?.completed || false}
          disabled={pending}
          onClick={() =>
            transition(async () => {
              setError("");
              const form = new FormData();
              for (const [key, value] of Object.entries({
                id: check?.id || id,
                area_id: areaId,
                expected: check?.updated_at || "",
                routine_id: routine.id,
                completed_on: date,
                completed: String(!check?.completed),
              }))
                form.set(key, value);
              try {
                const result = await saveRoutineCheck({ status: "idle" }, form);
                if (result.status === "error")
                  setError(result.message || "Não foi possível salvar.");
              } catch {
                setError(
                  "Não foi possível salvar. Recarregue e tente novamente.",
                );
              }
            })
          }
        >
          {check?.completed && <Check size={17} />}
        </button>
        <div>
          <strong>{routine.title}</strong>
          <p>{check?.completed ? "Feito" : "Pendente"}</p>
        </div>
        <button className="text-link" onClick={onEdit}>
          Editar rotina
        </button>
      </div>
      {error && (
        <p role="alert" className="form-message error">
          {error}
        </p>
      )}
    </li>
  );
}
export function HealthDashboard({
  context,
  data,
}: {
  context: DashboardContext;
  data: HealthData;
}) {
  const [editor, setEditor] = useState<Editor | null>(null),
    [date, setDate] = useState(context.today);
  const saved = useCallback(() => setEditor(null), []);
  const stats = healthDashboard(data, context.start, context.today),
    settings = data.settings[0];
  const routineList = (kind: "ORAL" | "SLEEP") =>
    data.routines.filter((r) => r.kind === kind && routineExpected(r, date));
  const checklist = (kind: "ORAL" | "SLEEP") => (
    <>
      {routineList(kind).length ? (
        <ul className="specialized-checklist">
          {routineList(kind).map((r) => (
            <RoutineRow
              key={r.id + date}
              routine={r}
              check={data.checks.find(
                (c) => c.routine_id === r.id && c.completed_on === date,
              )}
              areaId={context.area.id}
              date={date}
              onEdit={() =>
                setEditor({ kind: "routine", item: r, routineKind: kind })
              }
            />
          ))}
        </ul>
      ) : (
        <Empty>Nenhuma rotina configurada para esta data.</Empty>
      )}
      <button
        className="text-link"
        onClick={() => setEditor({ kind: "routine", routineKind: kind })}
      >
        {kind === "ORAL" ? "Adicionar rotina bucal +" : "Adicionar ritual +"}
      </button>
    </>
  );
  return (
    <DashboardFrame
      context={context}
      title="Sono e Saúde Bucal"
      color="#ff9e51"
      description="Acompanhe suas noites de sono e a consistência das rotinas que você escolheu cuidar."
      quote="Descansar hoje é construir um amanhã com mais energia."
      toolbar={
        <>
          <button
            className="button primary"
            onClick={() => setEditor({ kind: "night" })}
          >
            Registrar noite de sono
          </button>
          <button
            className="button secondary"
            onClick={() => setEditor({ kind: "settings", item: settings })}
          >
            Definir meta de sono
          </button>
        </>
      }
    >
      <WeekControl context={context} />
      <Card title="Horas de sono">
        <div className="specialized-card-heading">
          <p>Segunda a domingo · duração por data de despertar</p>
          <p>
            Média da semana:{" "}
            <strong data-testid="sleep-average">
              {stats.average === null
                ? "Sem registros"
                : `${n(stats.average / 60)} h`}
            </strong>
          </p>
        </div>
        <Bars
          data={stats.week}
          divisor={60}
          target={settings?.sleep_target_minutes || undefined}
        />
        <p>
          {settings?.sleep_target_minutes
            ? `Meta pessoal: ${n(settings.sleep_target_minutes / 60)} h por noite.`
            : "Sem meta definida."}{" "}
          Dias sem registro aparecem como “—” e não entram na média.
        </p>
        <div className="specialized-note">
          <strong>Energia ao acordar hoje</strong>
          <div
            className="sleep-energy"
            aria-label={
              stats.energy
                ? `Autoavaliação: ${stats.energy} de 5`
                : "Energia não registrada"
            }
          >
            {[1, 2, 3, 4, 5].map((i) => (
              <i
                key={i}
                className={stats.energy && i <= stats.energy ? "active" : ""}
              />
            ))}
          </div>
          <p>
            {stats.energy
              ? `${stats.energy} de 5 · autoavaliação informada por você`
              : "Sem autoavaliação registrada hoje."}
          </p>
        </div>
      </Card>
      <div className="specialized-metrics">
        <Metric
          label="Média da semana"
          value={stats.average === null ? "—" : `${n(stats.average / 60)} h`}
          detail={`${stats.coverage} de 7 noites registradas`}
        />
        <Metric
          label="Noites com 7h ou mais"
          value={stats.sevenHours}
          detail="Contagem descritiva das noites registradas"
        />
        <Metric
          label="Regularidade dos horários"
          value={
            stats.wakeVariation === null
              ? "Sem base"
              : `${n(stats.wakeVariation)} min`
          }
          detail={
            stats.bedVariation === null
              ? "Registre pelo menos duas noites"
              : `Variação ao acordar · ao deitar: ${n(stats.bedVariation)} min`
          }
        />
      </div>
      <div className="specialized-month">
        <Field
          label="Data dos checklists"
          type="date"
          min="1900-01-01"
          max={context.today}
          value={date}
          onChange={(e) => {
            if (e.target.value) setDate(e.target.value);
          }}
        />
        <p className="specialized-subtitle">
          Itens diários definidos por você · datas locais em{" "}
          {context.profile.timezone}
        </p>
      </div>
      <div className="specialized-grid">
        <Card title="Rituais para dormir melhor">
          <p>Pequenas ações escolhidas por você.</p>
          {checklist("SLEEP")}
        </Card>
        <Actions context={context} />
      </div>
      <section
        className="oral-dashboard"
        style={{ "--accent": "#47d6c7" } as React.CSSProperties}
      >
        <div className="specialized-grid">
          <Card title="Saúde Bucal — rotina diária">
            <p>
              Crie seus próprios itens para cada momento do dia. Esta área
              registra cumprimento.
            </p>
            {checklist("ORAL")}
          </Card>
          <Card title="Consistência bucal da semana">
            <div className="specialized-total">
              <strong data-testid="oral-consistency">
                {stats.oral.percent === null
                  ? "Sem base"
                  : `${n(stats.oral.percent)}%`}
              </strong>
            </div>
            <p>
              {stats.oral.done} de {stats.oral.expected} itens previstos até
              hoje nesta semana.
            </p>
            <Bar value={stats.oral.percent || 0} label="Consistência bucal" />
            <Bars data={stats.oral.days} unit="%" target={100} />
            <p>
              Proporção de itens marcados entre os previstos em cada dia; dias
              futuros ficam fora do cálculo.
            </p>
          </Card>
        </div>
      </section>
      <div className="specialized-grid">
        <Card title="Histórico de sono">
          <div className="specialized-history">
            {data.nights.filter((l) => !l.is_deleted).length ? (
              data.nights
                .filter((l) => !l.is_deleted)
                .toSorted((a, b) => b.wake_on.localeCompare(a.wake_on))
                .map((l) => (
                  <div className="specialized-row" key={l.id}>
                    <Moon size={23} />
                    <div>
                      <strong>
                        {l.wake_on} ·{" "}
                        {n(
                          (Date.parse(l.wake_at) - Date.parse(l.bed_at)) /
                            3600000,
                        )}{" "}
                        h
                      </strong>
                      <p>
                        {localDateTime(l.bed_at, l.timezone).replace("T", " ")}{" "}
                        →{" "}
                        {localDateTime(l.wake_at, l.timezone).replace("T", " ")}
                      </p>
                      <p>
                        {l.timezone}
                        {l.energy ? ` · Energia ${l.energy}/5` : ""}
                      </p>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => setEditor({ kind: "night", item: l })}
                    >
                      Corrigir noite
                    </button>
                  </div>
                ))
            ) : (
              <Empty>Nenhuma noite registrada.</Empty>
            )}
          </div>
        </Card>
        <Card title="Histórico de cumprimento">
          <div className="specialized-history">
            {stats.oral.days.map((d, i) => (
              <div className="specialized-row" key={d.date}>
                <Smile size={20} />
                <div>
                  <strong>{d.date}</strong>
                  <p>
                    Bucal: {d.done}/{d.expected} · Sono:{" "}
                    {stats.rituals.days[i].done}/
                    {stats.rituals.days[i].expected}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <details>
            <summary>Rotinas e encerramentos</summary>
            {data.routines.map((r) => (
              <div className="specialized-row" key={r.id}>
                <div>
                  <strong>{r.title}</strong>
                  <p>
                    {r.kind === "ORAL" ? "Saúde Bucal" : "Sono"} · desde{" "}
                    {r.starts_on}
                    {r.ends_on ? ` até ${r.ends_on}` : ""}
                  </p>
                </div>
                <button
                  className="text-link"
                  onClick={() =>
                    setEditor({ kind: "routine", item: r, routineKind: r.kind })
                  }
                >
                  Editar rotina
                </button>
              </div>
            ))}
          </details>
        </Card>
      </div>
      <Objectives context={context} />
      {editor && (
        <Modal
          title={
            editor.kind === "night"
              ? "Noite de sono"
              : editor.kind === "settings"
                ? "Meta pessoal de sono"
                : editor.routineKind === "ORAL"
                  ? "Rotina de Saúde Bucal"
                  : "Ritual de sono"
          }
          onClose={() => setEditor(null)}
        >
          {editor.kind === "night" ? (
            <EntryForm
              action={saveSleepLog}
              areaId={context.area.id}
              item={editor.item}
              onSaved={saved}
              label="Salvar noite"
            >
              <p className="field-help">
                Horários em {editor.item?.timezone || context.profile.timezone}.
                Uma noite principal por data de despertar; para ajustar, corrija
                o registro existente.
              </p>
              <Field
                label="Quando deitou"
                name="bed_local"
                type="datetime-local"
                required
                defaultValue={
                  editor.item
                    ? localDateTime(editor.item.bed_at, editor.item.timezone)
                    : addDays(context.today, -1) + "T23:00"
                }
              />
              <Field
                label="Quando acordou"
                name="wake_local"
                type="datetime-local"
                required
                defaultValue={
                  editor.item
                    ? localDateTime(editor.item.wake_at, editor.item.timezone)
                    : context.today + "T07:00"
                }
              />
              <Select
                label="Energia ao acordar (opcional)"
                name="energy"
                defaultValue={editor.item?.energy || ""}
              >
                <option value="">Não registrar</option>
                {[1, 2, 3, 4, 5].map((i) => (
                  <option key={i} value={i}>
                    {i} de 5
                  </option>
                ))}
              </Select>
              <details>
                <summary>Horário repetido em mudança de fuso</summary>
                <p className="field-help">
                  Se o horário ocorrer duas vezes, informe o deslocamento UTC
                  observado naquela noite.
                </p>
                <Field
                  label="UTC ao deitar (opcional)"
                  name="bed_offset"
                  placeholder="-03:00"
                />
                <Field
                  label="UTC ao acordar (opcional)"
                  name="wake_offset"
                  placeholder="-03:00"
                />
              </details>
              <Select
                label="Situação da noite"
                name="is_deleted"
                defaultValue="false"
              >
                <option value="false">Válida</option>
                <option value="true">Remover do histórico</option>
              </Select>
            </EntryForm>
          ) : editor.kind === "settings" ? (
            <EntryForm
              action={saveHealthSettings}
              areaId={context.area.id}
              item={editor.item}
              onSaved={saved}
              label="Salvar meta de sono"
            >
              <Field
                label="Meta pessoal por noite em minutos (opcional)"
                name="sleep_target_minutes"
                type="number"
                min={1}
                max={1440}
                defaultValue={settings?.sleep_target_minutes || ""}
              />
              <p className="field-help">
                Informe o alvo que deseja acompanhar. A meta não é uma
                recomendação de saúde.
              </p>
            </EntryForm>
          ) : (
            <EntryForm
              action={saveHealthRoutine}
              areaId={context.area.id}
              item={editor.item}
              onSaved={saved}
              label="Salvar rotina"
            >
              <Field
                label="Nome da rotina"
                name="title"
                required
                maxLength={160}
                defaultValue={editor.item?.title}
              />
              <input
                type="hidden"
                name="kind"
                value={editor.item?.kind || editor.routineKind}
              />
              <Field
                label="Início da rotina"
                name="starts_on"
                type="date"
                required
                readOnly={!!editor.item}
                defaultValue={editor.item?.starts_on || context.today}
              />
              <Field
                label="Último dia previsto (opcional)"
                name="ends_on"
                type="date"
                min={context.today}
                defaultValue={editor.item?.ends_on || ""}
              />
              <p className="field-help">
                Um item diário por momento da sua rotina. O início e o tipo
                ficam preservados. Encerrar a partir de hoje mantém o histórico
                anterior; para retomar uma rotina já encerrada, crie outra.
              </p>
            </EntryForm>
          )}
        </Modal>
      )}
    </DashboardFrame>
  );
}
