"use client";
import Link from "next/link";
import { useState, useCallback, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, ArrowLeft, Target } from "lucide-react";
import type { Area, Profile } from "@/types/database";
import type { Objective, PlanningData, WeeklyGoal, GoalRecord } from "./types";
import { calculatePlanning } from "./normalize";
import {
  GoalForm,
  RecordForm,
  RemoveRecordForm,
  TYPE_LABELS,
} from "./goal-forms";
import { Modal } from "@/components/ui/modal";
import { AreaIcon } from "@/components/ui/icon";
import { PageHeading } from "@/components/ui/page-heading";
import { WeekSelector } from "@/components/navigation/week-selector";
import {
  AreaBreakdown,
  GoalNumbers,
  ScoreBadge,
} from "@/components/data/performance";
import { formatPercent } from "@/lib/formatting/performance";
import { resolveWeekStart } from "@/lib/dates/weeks";
import { EmptyState } from "@/components/ui/empty-state";
type Editor =
  | { kind: "goal"; area: Area; goal?: WeeklyGoal }
  | { kind: "record"; goal: WeeklyGoal; record?: GoalRecord }
  | { kind: "remove"; record: GoalRecord };
export function PlanningWorkspace({
  areas,
  objectives,
  data,
  profile,
  start,
  areaId,
}: {
  areas: Area[];
  objectives: Objective[];
  data: PlanningData;
  profile: Profile;
  start: string;
  areaId?: string;
}) {
  const router = useRouter();
  const [editor, setEditor] = useState<Editor | null>(null);
  const [notice, setNotice] = useState("");
  const onSaved = useCallback(
    (message: string) => {
      setEditor(null);
      setNotice(message);
      router.refresh();
    },
    [router],
  );
  const performance = calculatePlanning(areas, data);
  const selected = performance.areas.filter((a) => !areaId || a.id === areaId);
  const selectedArea = areas.find((a) => a.id === areaId);
  const timezone = data.week?.timezone || profile.timezone;
  return (
    <>
      {areaId && (
        <Link href={"/planejamento?week=" + start} className="text-link">
          <ArrowLeft size={15} />
          Todas as áreas
        </Link>
      )}
      <PageHeading
        eyebrow="PLANEJAR · EXECUTAR · ACOMPANHAR"
        title={selectedArea?.name || "Planejamento semanal"}
        description="Defina compromissos claros e acompanhe o que realizou."
      />
      <WeekSelector
        start={start}
        current={resolveWeekStart(undefined, profile.timezone)}
        timezone={timezone}
      />
      {timezone !== profile.timezone && (
        <p className="inline-alert">
          Esta semana preserva o fuso {timezone}. Semanas novas usarão{" "}
          {profile.timezone}.
        </p>
      )}
      <div role="status" className="live-notice">
        {notice}
      </div>
      <section className="week-summary compact">
        <div>
          <span className="eyebrow">DESEMPENHO GERAL DA SEMANA</span>
          <div data-testid="week-score">
            <ScoreBadge result={performance.week} />
          </div>
        </div>
        <div className="week-summary-meta">
          <strong data-testid="week-percent">
            {performance.week.exact
              ? formatPercent(performance.week.exact.performance)
              : "—"}
          </strong>
          <span>
            {performance.week.calculableCount} de {areas.length} áreas com
            resultado calculável
          </span>
        </div>
      </section>
      {!areas.length && (
        <EmptyState
          title="Primeiro, escolha suas áreas"
          action={
            <Link className="button primary" href="/areas">
              Criar uma área
            </Link>
          }
        >
          As metas da semana serão organizadas dentro das suas áreas.
        </EmptyState>
      )}
      <div className="planning-sections">
        {selected.map(({ area, goals, result }) => (
          <section
            className="planning-area"
            key={area.id}
            style={{ "--area-color": area.color } as CSSProperties}
            data-testid={"planning-area-" + area.name}
          >
            <div className="planning-area-heading">
              <div className="area-identity">
                <span className="area-icon">
                  <AreaIcon name={area.icon} size={24} />
                </span>
                <div>
                  <h2>{area.name}</h2>
                  <span>
                    {goals.filter((g) => g.goal.state === "ACTIVE").length}{" "}
                    metas ativas
                  </span>
                </div>
              </div>
              <div className="area-heading-score" data-testid="area-score">
                <ScoreBadge result={result} />
                {result.exact && (
                  <span>{formatPercent(result.exact.performance)}</span>
                )}
              </div>
              <Link
                className="text-link"
                href={"/areas/" + area.id + "/leitura?week=" + start}
              >
                Leitura
              </Link>
              <button
                className="button secondary"
                onClick={() => setEditor({ kind: "goal", area })}
              >
                <Plus size={16} />
                Nova meta
              </button>
            </div>
            {goals.length ? (
              <div className="goal-grid">
                {goals.map(({ goal, result: goalResult }) => {
                  const records = data.records.filter(
                    (r) => r.goal_id === goal.id && !r.is_deleted,
                  );
                  const source = data.sources.find(
                    (s) => s.goal_id === goal.id,
                  );
                  const moduleSource = source?.kind === "MODULE";
                  return (
                    <article
                      className={
                        "goal-card " +
                        (goal.state === "CANCELLED" ? "cancelled" : "")
                      }
                      key={goal.id}
                      data-testid={"goal-" + goal.title}
                    >
                      <div className="goal-top">
                        <span className="goal-type">
                          {TYPE_LABELS[goal.type]} ·{" "}
                          {moduleSource ? "Leitura" : "Manual"}
                          {goal.basis === "DAILY" ? " · Alvo diário" : ""}
                        </span>
                        <button
                          className="small-icon-button"
                          aria-label={"Editar meta " + goal.title}
                          onClick={() =>
                            setEditor({ kind: "goal", area, goal })
                          }
                        >
                          <Pencil size={15} />
                        </button>
                      </div>
                      <h3>{goal.title}</h3>
                      {goal.objective_id && (
                        <p className="goal-objective">
                          <Target size={12} />
                          {
                            objectives.find((o) => o.id === goal.objective_id)
                              ?.title
                          }
                        </p>
                      )}
                      {goal.state === "CANCELLED" ? (
                        <p className="no-result">Retirada do cálculo</p>
                      ) : (
                        <GoalNumbers
                          result={goalResult}
                          unit={goal.unit}
                          observationUnit={goal.observation_unit}
                        />
                      )}
                      {moduleSource ? (
                        <div className="goal-footer">
                          <Link
                            className="button secondary"
                            href={
                              "/areas/" +
                              area.id +
                              "/leitura" +
                              (source?.book_id ? "/" + source.book_id : "") +
                              "?week=" +
                              start
                            }
                          >
                            Registrar leitura
                          </Link>
                          <span>Fonte: ReadingLog</span>
                        </div>
                      ) : (
                        <div className="goal-footer">
                          <button
                            className="button secondary"
                            disabled={goal.state === "CANCELLED"}
                            onClick={() =>
                              setEditor({
                                kind: "record",
                                goal,
                                record:
                                  goal.type === "COMPLETION"
                                    ? records[0]
                                    : undefined,
                              })
                            }
                          >
                            <Plus size={14} />
                            {goal.type === "COMPLETION"
                              ? "Atualizar conclusão"
                              : "Registrar execução"}
                          </button>
                          <span>
                            {records.length}{" "}
                            {records.length === 1 ? "registro" : "registros"}
                          </span>
                        </div>
                      )}
                      {records.length > 0 && (
                        <details className="record-list">
                          <summary>Ver registros</summary>
                          {records.map((record) => (
                            <div className="record-row" key={record.id}>
                              <div>
                                <span>
                                  {new Intl.DateTimeFormat("pt-BR", {
                                    timeZone: "UTC",
                                  }).format(
                                    new Date(record.recorded_on + "T12:00:00Z"),
                                  )}
                                </span>
                                <strong>
                                  {record.value !== null
                                    ? record.value.replace(".", ",") +
                                      " " +
                                      goal.unit
                                    : record.completed
                                      ? "Concluída"
                                      : "Pendente"}
                                </strong>
                              </div>
                              <button
                                className="small-icon-button"
                                aria-label={
                                  "Editar registro de " + record.recorded_on
                                }
                                onClick={() =>
                                  setEditor({ kind: "record", goal, record })
                                }
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                className="small-icon-button delete-button"
                                aria-label={
                                  "Remover registro de " + record.recorded_on
                                }
                                onClick={() =>
                                  setEditor({ kind: "remove", record })
                                }
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          ))}
                        </details>
                      )}
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="unplanned-state">
                <p>Sem meta semanal</p>
                <span>
                  Esta área não participa do desempenho geral até ter uma meta
                  calculável.
                </span>
              </div>
            )}
            <AreaBreakdown
              name={area.name}
              result={result}
              labels={Object.fromEntries(
                goals.map((g) => [g.id, g.goal.title]),
              )}
            />
          </section>
        ))}
      </div>
      {editor && (
        <Modal
          title={
            editor.kind === "goal"
              ? editor.goal
                ? "Editar meta semanal"
                : "Nova meta semanal"
              : editor.kind === "remove"
                ? "Remover registro?"
                : editor.record
                  ? "Editar execução"
                  : "Registrar execução"
          }
          onClose={() => setEditor(null)}
        >
          {editor.kind === "goal" ? (
            <GoalForm
              goal={editor.goal}
              areaId={editor.area.id}
              start={start}
              objectives={objectives}
              readingModule={data.area_modules?.find(
                (m) => m.area_id === editor.area.id,
              )}
              readingBooks={data.reading_books}
              source={data.sources.find((s) => s.goal_id === editor.goal?.id)}
              locked={
                !!editor.goal &&
                (data.sources.some(
                  (s) => s.goal_id === editor.goal!.id && s.kind === "MODULE",
                ) ||
                  data.records.some((r) => r.goal_id === editor.goal!.id))
              }
              onSaved={onSaved}
            />
          ) : editor.kind === "record" ? (
            <RecordForm
              goal={editor.goal}
              record={editor.record}
              start={start}
              timezone={timezone}
              onSaved={onSaved}
            />
          ) : (
            <RemoveRecordForm record={editor.record} onSaved={onSaved} />
          )}
        </Modal>
      )}
    </>
  );
}
