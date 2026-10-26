"use client";
import Link from "next/link";
import { useCallback, useState } from "react";
import { Briefcase, GraduationCap, Star, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { careerDashboard } from "@/domain/career/dashboard";
import {
  DashboardFrame,
  Card,
  Metric,
  Bar,
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
import type { Area } from "@/types/database";
import type {
  CareerData,
  CareerProject,
  CareerMilestone,
  CareerCommitment,
  CareerSettings,
  CareerReview,
} from "./types";
import {
  saveCareerProject,
  saveCareerMilestone,
  saveCareerCommitment,
  saveCareerSettings,
  saveCareerReview,
} from "./actions";
type Editor =
  | { kind: "project"; item?: CareerProject }
  | { kind: "milestone"; item?: CareerMilestone }
  | { kind: "commitment"; item?: CareerCommitment }
  | { kind: "settings"; item?: CareerSettings }
  | { kind: "review"; item?: CareerReview };
const kindLabels = {
  TASK: "Tarefa",
  MILESTONE: "Marco",
  LESSON: "Aula",
  DELIVERY: "Entrega",
};
export function CareerDashboard({
  context,
  data,
  areas,
}: {
  context: DashboardContext;
  data: CareerData;
  areas: Area[];
}) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const saved = useCallback(() => setEditor(null), []);
  const stats = careerDashboard(data, context.start, context.today),
    settings = data.settings[0];
  const focus = context.objectives.find((o) => o.id === settings?.objective_id);
  const focusPercent =
    focus && focus.type !== "QUALITATIVE" && Number(focus.target) > 0
      ? (Number(focus.current_value) / Number(focus.target)) * 100
      : null;
  const projectList = (kind: "WORK" | "DEVELOPMENT") =>
    stats.active
      .filter((p) => p.kind === kind)
      .map((p) => (
        <div key={p.id} className="specialized-row">
          <span className="specialized-row-icon">
            {kind === "WORK" ? (
              <Briefcase size={24} />
            ) : (
              <GraduationCap size={24} />
            )}
          </span>
          <div>
            <strong>{p.title}</strong>
            <p>
              {p.total
                ? `${p.done}/${p.total} marcos concluídos`
                : "Sem marcos definidos"}{" "}
              · {p.due_on ? `Prazo ${p.due_on}` : "Sem prazo"}
            </p>
            {p.percent !== null && <Bar value={p.percent} label={p.title} />}
          </div>
          <span className="specialized-ratio">
            {p.percent === null ? "—" : `${n(p.percent)}%`}
          </span>
          <button
            className="text-link"
            onClick={() => setEditor({ kind: "project", item: p })}
          >
            Editar
          </button>
        </div>
      ));
  return (
    <DashboardFrame
      context={context}
      title="Foco profissional"
      color="#9690ff"
      description="Acompanhe seus projetos, desenvolva suas habilidades e avance na direção da carreira que você quer construir."
      quote="Disciplina profissional constrói a liberdade que eu quero."
      heroContent={
        <div className="career-rhythm">
          <div className="specialized-total">
            <strong data-testid="career-on-track">{stats.onTrack}</strong>
            <span>de {stats.measurable.length} projetos no ritmo</span>
            <b>
              {stats.measurable.length
                ? `${n((stats.onTrack / stats.measurable.length) * 100)}%`
                : "Sem base"}
            </b>
          </div>
          <Bar
            value={
              stats.measurable.length
                ? (stats.onTrack / stats.measurable.length) * 100
                : 0
            }
            label="Projetos no ritmo"
          />
          <p className="specialized-subtitle">
            Situação atual dos projetos com prazo, sem marcos pendentes
            vencidos.
          </p>
        </div>
      }
      toolbar={
        <>
          <button
            className="button primary"
            onClick={() => setEditor({ kind: "project" })}
          >
            Novo projeto ou competência
          </button>
          <button
            className="button secondary"
            onClick={() => setEditor({ kind: "commitment" })}
          >
            Agendar compromisso
          </button>
          <button
            className="button secondary"
            onClick={() => setEditor({ kind: "settings", item: settings })}
          >
            Definir foco
          </button>
        </>
      }
    >
      <WeekControl context={context} />
      <div className="specialized-metrics four">
        <Metric
          label="Reuniões da semana"
          value={`${stats.meetings.done} / ${stats.meetings.total}`}
          detail="Realizadas / previstas na semana selecionada"
        />
        <Metric
          label="Entregas do mês"
          value={`${stats.deliveries.done} / ${stats.deliveries.total}`}
          detail={`Concluídas / previstas em ${context.start.slice(0, 7)}`}
        />
        <Metric
          label="Horas de estudo"
          value={
            stats.minutes === null
              ? "Sem vínculo"
              : `${n(stats.minutes / 60)}${settings?.study_target_minutes ? ` / ${n(settings.study_target_minutes / 60)}` : ""} h`
          }
          detail={
            stats.minutes === null
              ? "Escolha uma área em Definir foco"
              : `Sessões de ${areas.find((a) => a.id === settings?.study_area_id)?.name}`
          }
        />
        <Metric
          label="Projetos ativos"
          value={stats.active.filter((p) => p.kind === "WORK").length}
          detail="Em andamento no trabalho atual"
        />
      </div>
      <div className="specialized-grid">
        <Card
          title="Trabalho atual"
          action={
            <button
              className="text-link"
              onClick={() => setEditor({ kind: "project" })}
            >
              Adicionar +
            </button>
          }
        >
          {projectList("WORK").length ? (
            projectList("WORK")
          ) : (
            <Empty>Cadastre um projeto de trabalho e seus marcos.</Empty>
          )}
        </Card>
        <Card
          title="Desenvolvimento pessoal"
          action={
            <button
              className="text-link"
              onClick={() => setEditor({ kind: "project" })}
            >
              Adicionar +
            </button>
          }
        >
          {projectList("DEVELOPMENT").length ? (
            projectList("DEVELOPMENT")
          ) : (
            <Empty>
              Defina competências e iniciativas com marcos verificáveis.
            </Empty>
          )}
        </Card>
      </div>
      <div className="specialized-grid">
        <Actions context={context} />
        <div className="stack">
          <Card
            title="Objetivo em foco"
            action={
              <Link href="/objetivos" className="text-link">
                Ver todos →
              </Link>
            }
          >
            {focus ? (
              <div className="specialized-row">
                <Star size={26} />
                <div>
                  <strong>{focus.title}</strong>
                  <p>
                    {focus.type === "QUALITATIVE"
                      ? "Acompanhamento qualitativo"
                      : `${focus.current_value} / ${focus.target} ${focus.unit}`}
                  </p>
                  {focusPercent !== null && (
                    <Bar value={focusPercent} label="Objetivo em foco" />
                  )}
                  <small>Progresso informado no objetivo compartilhado.</small>
                </div>
              </div>
            ) : (
              <Empty>Escolha um objetivo da área em Definir foco.</Empty>
            )}
          </Card>
          <Card
            title="Revisão da carreira"
            action={
              <button
                className="button primary"
                onClick={() => setEditor({ kind: "review" })}
              >
                Começar revisão →
              </button>
            }
          >
            <p>
              Registre conquistas, aprendizados e próximos passos. Sua reflexão
              não gera uma nota automática.
            </p>
          </Card>
        </div>
      </div>
      <div className="specialized-grid">
        <Card
          title="Marcos e tarefas"
          action={
            <button
              className="text-link"
              disabled={!data.projects.length}
              onClick={() => setEditor({ kind: "milestone" })}
            >
              Novo marco +
            </button>
          }
        >
          <div className="specialized-history">
            {data.milestones.filter((m) => !m.is_deleted).length ? (
              data.milestones
                .filter((m) => !m.is_deleted)
                .map((m) => (
                  <div className="specialized-row" key={m.id}>
                    <CheckCircle2 size={20} />
                    <div>
                      <strong>{m.title}</strong>
                      <p>
                        {
                          data.projects.find((p) => p.id === m.project_id)
                            ?.title
                        }{" "}
                        · {kindLabels[m.kind]} ·{" "}
                        {m.completed_on
                          ? `Concluído ${m.completed_on}`
                          : m.due_on
                            ? `Prazo ${m.due_on}`
                            : "Sem prazo"}
                      </p>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => setEditor({ kind: "milestone", item: m })}
                    >
                      Atualizar
                    </button>
                  </div>
                ))
            ) : (
              <Empty>
                O progresso é calculado a partir dos marcos cadastrados.
              </Empty>
            )}
          </div>
        </Card>
        <Card title="Reuniões e entregas">
          <div className="specialized-history">
            {data.commitments.filter((c) => !c.is_deleted).length ? (
              data.commitments
                .filter((c) => !c.is_deleted)
                .sort((a, b) => a.due_on.localeCompare(b.due_on))
                .map((c) => (
                  <div className="specialized-row" key={c.id}>
                    <div>
                      <strong>{c.title}</strong>
                      <p>
                        {c.kind === "MEETING" ? "Reunião" : "Entrega"} ·{" "}
                        {c.due_on} · {c.completed_on ? "Concluído" : "Pendente"}
                      </p>
                    </div>
                    <button
                      className="text-link"
                      onClick={() => setEditor({ kind: "commitment", item: c })}
                    >
                      Atualizar compromisso
                    </button>
                  </div>
                ))
            ) : (
              <Empty>
                Agende reuniões e entregas para acompanhar sua execução.
              </Empty>
            )}
          </div>
        </Card>
      </div>
      <Card title="Histórico e conquistas">
        <div className="specialized-history">
          {stats.achievements.map((m) => (
            <div key={m.id} className="specialized-row">
              <Star size={19} />
              <div>
                <strong>{m.title}</strong>
                <p>
                  {m.completed_on} ·{" "}
                  {data.projects.find((p) => p.id === m.project_id)?.title}
                </p>
              </div>
            </div>
          ))}
          {data.reviews
            .toSorted((a, b) => b.reviewed_on.localeCompare(a.reviewed_on))
            .map((r) => (
              <div className="specialized-row" key={r.id}>
                <div>
                  <strong>Revisão de {r.reviewed_on}</strong>
                  <p>{r.wins}</p>
                  {r.lessons && <p>Aprendizados: {r.lessons}</p>}
                  {r.next_steps && <p>Próximos passos: {r.next_steps}</p>}
                </div>
                <button
                  className="text-link"
                  onClick={() => setEditor({ kind: "review", item: r })}
                >
                  Editar revisão
                </button>
              </div>
            ))}
          {!stats.achievements.length && !data.reviews.length && (
            <Empty>Suas conquistas e reflexões aparecerão aqui.</Empty>
          )}
        </div>
        <details>
          <summary>Projetos concluídos e arquivados</summary>
          {data.projects
            .filter((p) => p.status !== "ACTIVE")
            .map((p) => (
              <div className="specialized-row" key={p.id}>
                <strong>{p.title}</strong>
                <button
                  className="text-link"
                  onClick={() => setEditor({ kind: "project", item: p })}
                >
                  Editar projeto
                </button>
              </div>
            ))}
        </details>
      </Card>
      {editor && (
        <Modal
          title={
            {
              project: "Projeto ou competência",
              milestone: "Marco de carreira",
              commitment: "Compromisso profissional",
              settings: "Foco da carreira",
              review: "Revisão da carreira",
            }[editor.kind]
          }
          onClose={() => setEditor(null)}
        >
          {editor.kind === "project" ? (
            <EntryForm
              action={saveCareerProject}
              areaId={context.area.id}
              item={editor.item}
              onSaved={saved}
            >
              <Field
                label="Título do projeto ou competência"
                name="title"
                required
                defaultValue={editor.item?.title}
              />
              <Select
                label="Frente de desenvolvimento"
                name="kind"
                defaultValue={editor.item?.kind || "WORK"}
              >
                <option value="WORK">Trabalho atual</option>
                <option value="DEVELOPMENT">
                  Desenvolvimento pessoal / competência
                </option>
              </Select>
              <Field
                label="Prazo do projeto"
                name="due_on"
                type="date"
                defaultValue={editor.item?.due_on || ""}
              />
              <ObjectiveField
                objectives={context.objectives}
                areaId={context.area.id}
                value={editor.item?.objective_id}
              />
              <Select
                label="Situação do projeto"
                name="status"
                defaultValue={editor.item?.status || "ACTIVE"}
              >
                <option value="ACTIVE">Ativo</option>
                <option value="COMPLETED">Concluído</option>
                <option value="ARCHIVED">Arquivado</option>
              </Select>
            </EntryForm>
          ) : editor.kind === "settings" ? (
            <EntryForm
              action={saveCareerSettings}
              areaId={context.area.id}
              item={editor.item}
              onSaved={saved}
            >
              <Select
                label="Área de Estudos vinculada"
                name="study_area_id"
                defaultValue={settings?.study_area_id || ""}
              >
                <option value="">Sem vínculo</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </Select>
              <Field
                label="Alvo semanal de estudo em minutos (opcional)"
                name="study_target_minutes"
                type="number"
                min={1}
                max={10080}
                defaultValue={settings?.study_target_minutes || ""}
              />
              <ObjectiveField
                objectives={context.objectives}
                areaId={context.area.id}
                value={settings?.objective_id}
              />
              <p className="field-help">
                Somente sessões canônicas da área escolhida alimentam o cartão
                de horas. Não são criados registros duplicados.
              </p>
            </EntryForm>
          ) : editor.kind === "review" ? (
            <EntryForm
              action={saveCareerReview}
              areaId={context.area.id}
              item={editor.item}
              onSaved={saved}
              label="Salvar revisão"
            >
              <Field
                label="Data da revisão"
                name="reviewed_on"
                type="date"
                required
                max={context.today}
                defaultValue={editor.item?.reviewed_on || context.today}
              />
              <Field
                label="Conquistas e observações"
                name="wins"
                required
                maxLength={4000}
                defaultValue={editor.item?.wins}
              />
              <Field
                label="Aprendizados"
                name="lessons"
                maxLength={4000}
                defaultValue={editor.item?.lessons}
              />
              <Field
                label="Próximos passos"
                name="next_steps"
                maxLength={4000}
                defaultValue={editor.item?.next_steps}
              />
            </EntryForm>
          ) : (
            <EntryForm
              action={
                editor.kind === "milestone"
                  ? saveCareerMilestone
                  : saveCareerCommitment
              }
              areaId={context.area.id}
              item={editor.item}
              onSaved={saved}
              label={
                editor.kind === "milestone"
                  ? "Salvar marco"
                  : "Salvar compromisso"
              }
            >
              <Select
                label="Projeto relacionado"
                name="project_id"
                required={editor.kind === "milestone"}
                defaultValue={
                  editor.item?.project_id ||
                  (editor.kind === "milestone" ? data.projects[0]?.id : "")
                }
              >
                <option value="">Sem projeto</option>
                {data.projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </Select>
              <Field
                label={
                  editor.kind === "milestone"
                    ? "Título do marco"
                    : "Título do compromisso"
                }
                name="title"
                required
                defaultValue={editor.item?.title}
              />
              <Select
                label="Tipo"
                name="kind"
                defaultValue={
                  editor.item?.kind ||
                  (editor.kind === "milestone" ? "TASK" : "MEETING")
                }
              >
                {editor.kind === "milestone" ? (
                  Object.entries(kindLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="MEETING">Reunião</option>
                    <option value="DELIVERY">Entrega</option>
                  </>
                )}
              </Select>
              <Field
                label="Data prevista"
                name="due_on"
                type="date"
                required={editor.kind === "commitment"}
                defaultValue={editor.item?.due_on || ""}
              />
              <Field
                label="Concluído em (vazio = pendente)"
                name="completed_on"
                type="date"
                max={context.today}
                defaultValue={editor.item?.completed_on || ""}
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
          )}
        </Modal>
      )}
    </DashboardFrame>
  );
}
