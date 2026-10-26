"use client";
import { useCallback, useState } from "react";
import { BookOpen, Flame, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { studiesDashboard } from "@/domain/studies/dashboard";
import { calculatePlanning } from "@/features/planning/normalize";
import type { PlanningData, WeeklyGoal } from "@/features/planning/types";
import type { Area } from "@/types/database";
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
  type DashboardContext,
} from "@/features/specialized/ui";
import {
  EntryForm,
  Field,
  Select,
  ObjectiveField,
} from "@/features/specialized/forms";
import { saveStudyGoal, saveStudySession, saveStudySubject } from "./actions";
import type { StudiesData, StudySession, StudySubject } from "./types";
type Editor =
  | { kind: "subject"; item?: StudySubject }
  | { kind: "session"; item?: StudySession }
  | { kind: "goal"; item?: WeeklyGoal };
export function StudiesDashboard({
  context,
  data,
  planning,
  areas,
}: {
  context: DashboardContext;
  data: StudiesData;
  planning: PlanningData;
  areas: Area[];
}) {
  const [editor, setEditor] = useState<Editor | null>(null),
    [selectedGoal, setSelectedGoal] = useState("");
  const saved = useCallback(() => setEditor(null), []);
  const stats = studiesDashboard(data.sessions, context.start, context.today);
  const goals = calculatePlanning(areas, planning)
    .areas.find((a) => a.id === context.area.id)!
    .goals.filter((g) =>
      planning.sources.some(
        (s) => s.goal_id === g.id && s.module === "STUDIES",
      ),
    );
  const goal =
    goals.find((g) => g.id === selectedGoal && g.goal.state === "ACTIVE") ||
    goals.find((g) => g.goal.state === "ACTIVE");
  const sessions = data.sessions.filter((s) => !s.is_deleted);
  const subjects = data.subjects.filter((s) => !s.archived);
  return (
    <DashboardFrame
      context={context}
      title="Estudos"
      compact
      headingIcon={<BookOpen size={32} />}
      color="#f4bd55"
      description="Mais conhecimento, mais clareza para construir a vida que quero."
      quote="Aprender hoje abre caminhos para amanhã."
      toolbar={
        <>
          <button
            className="button secondary"
            onClick={() => setEditor({ kind: "goal", item: goal?.goal })}
          >
            Definir meta de estudos
          </button>
          <button
            className="button primary"
            disabled={!subjects.length}
            onClick={() => setEditor({ kind: "session" })}
          >
            <Plus size={15} />
            Registrar sessão
          </button>
        </>
      }
    >
      <WeekControl context={context} />
      <div className="specialized-grid">
        <Card title="Estudos da semana">
          <p>
            {goal
              ? `Minha meta é estudar ${n(Number(goal.goal.target) / 60)} horas esta semana.`
              : "Defina uma meta semanal e registre suas sessões."}
          </p>
          {goals.filter((g) => g.goal.state === "ACTIVE").length > 1 && (
            <Select
              label="Meta exibida"
              value={goal?.id || ""}
              onChange={(e) => setSelectedGoal(e.target.value)}
            >
              {goals
                .filter((g) => g.goal.state === "ACTIVE")
                .map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.goal.title}
                  </option>
                ))}
            </Select>
          )}
          <div className="specialized-total">
            <strong data-testid="study-hours">{n(stats.minutes / 60)}</strong>
            <span>
              horas{" "}
              {goal ? `de ${n(Number(goal.goal.target) / 60)}` : "registradas"}
            </span>
            <b data-testid="study-percent">
              {goal ? `${n(goal.result.rawPercent || 0)}%` : "Sem meta"}
            </b>
          </div>
          <Bar
            value={goal?.result.rawPercent || 0}
            label="Meta semanal de estudos"
          />
          <div className="specialized-days">
            {stats.week.map((d, i) => (
              <div key={d.date} className={d.value ? "active" : ""}>
                <i />
                <span>
                  {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"][i]}
                </span>
                <strong>{n(d.value / 60)}h</strong>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Últimos 14 dias">
          <p>Horas de estudo por dia · Média: {n(stats.average / 60)} h/dia</p>
          <Bars data={stats.history} divisor={60} />
        </Card>
      </div>
      <div className="specialized-grid">
        <Metric
          label="Sequência atual"
          value={
            <>
              <Flame size={24} /> {stats.streak}{" "}
              {stats.streak === 1 ? "dia" : "dias"}
            </>
          }
          detail="Dias distintos com estudo até hoje ou ontem."
        />
        <figure className="panel specialized-inspiration">
          <blockquote>
            “Aprender hoje abre caminhos
            <br />
            para amanhã.”
          </blockquote>
        </figure>
      </div>
      <div className="specialized-grid">
        <Card
          title="Disciplinas em andamento"
          action={
            <button
              className="text-link"
              onClick={() => setEditor({ kind: "subject" })}
            >
              Adicionar disciplina +
            </button>
          }
        >
          {subjects.length ? (
            subjects.map((s) => {
              const minutes = sessions
                .filter(
                  (l) => l.subject_id === s.id && l.studied_on <= context.today,
                )
                .reduce((v, l) => v + l.minutes, 0);
              return (
                <div className="specialized-row" key={s.id}>
                  <span className="specialized-row-icon">
                    <BookOpen size={25} />
                  </span>
                  <div>
                    <strong>{s.title}</strong>
                    <p>
                      {n(minutes / 60)} h{" "}
                      {s.target_minutes
                        ? `/ ${n(s.target_minutes / 60)} h`
                        : "· Sem alvo de duração"}
                    </p>
                    {s.target_minutes && (
                      <Bar
                        value={(minutes / s.target_minutes) * 100}
                        label={`Progresso de ${s.title}`}
                      />
                    )}
                  </div>
                  <button
                    className="text-link"
                    onClick={() => setEditor({ kind: "subject", item: s })}
                  >
                    Editar
                  </button>
                </div>
              );
            })
          ) : (
            <Empty>
              Cadastre uma disciplina para registrar sua primeira sessão.
            </Empty>
          )}
          {data.subjects.some((s) => s.archived) && (
            <details>
              <summary>Disciplinas arquivadas</summary>
              {data.subjects
                .filter((s) => s.archived)
                .map((s) => (
                  <button
                    key={s.id}
                    className="text-link"
                    onClick={() => setEditor({ kind: "subject", item: s })}
                  >
                    {s.title} · Reabrir
                  </button>
                ))}
            </details>
          )}
        </Card>
        <Actions context={context} />
      </div>
      <Card title="Histórico de estudos">
        <div className="specialized-history">
          {sessions.length ? (
            sessions.map((s) => (
              <div className="specialized-row" key={s.id}>
                <div>
                  <strong>
                    {data.subjects.find((d) => d.id === s.subject_id)?.title}
                  </strong>
                  <p>
                    {s.studied_on} · {s.minutes} min {s.notes && `· ${s.notes}`}
                  </p>
                </div>
                <button
                  className="text-link"
                  onClick={() => setEditor({ kind: "session", item: s })}
                >
                  Corrigir
                </button>
              </div>
            ))
          ) : (
            <Empty>Nenhuma sessão registrada.</Empty>
          )}
        </div>
      </Card>
      {editor && (
        <Modal
          title={
            editor.kind === "subject"
              ? "Disciplina"
              : editor.kind === "session"
                ? "Sessão de estudo"
                : "Meta semanal de estudos"
          }
          onClose={() => setEditor(null)}
        >
          {editor.kind === "subject" ? (
            <EntryForm
              action={saveStudySubject}
              areaId={context.area.id}
              item={editor.item}
              onSaved={saved}
            >
              <Field
                label="Disciplina ou assunto"
                name="title"
                required
                maxLength={160}
                defaultValue={editor.item?.title}
              />
              <Field
                label="Alvo total em minutos (opcional)"
                name="target_minutes"
                type="number"
                min={1}
                max={1000000}
                defaultValue={editor.item?.target_minutes ?? ""}
              />
              <ObjectiveField
                objectives={context.objectives}
                areaId={context.area.id}
                value={editor.item?.objective_id}
              />
              <Select
                label="Situação da disciplina"
                name="archived"
                defaultValue={String(editor.item?.archived || false)}
              >
                <option value="false">Em andamento</option>
                <option value="true">Arquivada</option>
              </Select>
            </EntryForm>
          ) : editor.kind === "session" ? (
            <EntryForm
              action={saveStudySession}
              areaId={context.area.id}
              item={editor.item}
              onSaved={saved}
              label="Salvar sessão"
            >
              <Select
                label="Disciplina"
                name="subject_id"
                required
                defaultValue={editor.item?.subject_id || subjects[0]?.id}
              >
                {data.subjects
                  .filter(
                    (s) => !s.archived || s.id === editor.item?.subject_id,
                  )
                  .map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
              </Select>
              <Field
                label="Data do estudo"
                name="studied_on"
                type="date"
                min="1900-01-01"
                max={context.today}
                required
                defaultValue={editor.item?.studied_on || context.today}
              />
              <Field
                label="Duração em minutos"
                name="minutes"
                type="number"
                min={1}
                max={1440}
                required
                defaultValue={editor.item?.minutes || 60}
              />
              <Field
                label="Anotações"
                name="notes"
                maxLength={2000}
                defaultValue={editor.item?.notes}
              />
              <Select
                label="Situação do registro"
                name="is_deleted"
                defaultValue="false"
              >
                <option value="false">Válido</option>
                <option value="true">Remover do histórico</option>
              </Select>
            </EntryForm>
          ) : (
            <EntryForm
              action={saveStudyGoal}
              areaId={context.area.id}
              item={editor.item}
              onSaved={saved}
              label="Salvar meta de estudos"
            >
              <input
                type="hidden"
                name="goal_id"
                value={editor.item?.id || ""}
              />
              <input type="hidden" name="start" value={context.start} />
              <Field
                label="Título da meta"
                name="title"
                required
                defaultValue={editor.item?.title || "Estudar nesta semana"}
              />
              <Field
                label="Meta semanal em minutos"
                name="target"
                type="number"
                min={1}
                max={10080}
                required
                defaultValue={editor.item?.target || 300}
              />
              <ObjectiveField
                objectives={context.objectives}
                areaId={context.area.id}
                value={editor.item?.objective_id}
              />
              <Select
                label="Situação da meta"
                name="state"
                defaultValue={editor.item?.state || "ACTIVE"}
              >
                <option value="ACTIVE">Ativa</option>
                <option value="CANCELLED">Retirada do cálculo</option>
              </Select>
              <p className="field-help">
                As sessões alimentam esta meta automaticamente, sem duplicar
                registros manuais.
              </p>
            </EntryForm>
          )}
        </Modal>
      )}
    </DashboardFrame>
  );
}
