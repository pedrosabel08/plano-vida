"use client";
import Link from "next/link";
import { useCallback, useState, type CSSProperties } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  ArrowLeft,
  Target,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import type { Area, Profile } from "@/types/database";
import type { PlanningData, Objective } from "@/features/planning/types";
import { calculatePlanning } from "@/features/planning/normalize";
import { GoalForm } from "@/features/planning/goal-forms";
import { GoalNumbers, ProgressBar } from "@/components/data/performance";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { WeekSelector } from "@/components/navigation/week-selector";
import { resolveWeekStart, weekLabel } from "@/lib/dates/weeks";
import {
  decimal,
  divide,
  multiply,
  HUNDRED,
  approximate,
} from "@/domain/performance/fraction";
import { formatPercent } from "@/lib/formatting/performance";
import type { ReadingData, ReadingBook, ReadingLog, BookStatus } from "./types";
import { BOOK_STATUS } from "./types";
import { BookCover } from "./book-cover";
import { AddBook, BookForm, ReadingLogForm, ModuleForm } from "./reading-forms";
import { ReadingOverview } from "./reading-overview";
import { AreaActionsCard } from "@/features/actions/area-actions-card";
import type { AreaActionsData } from "@/features/actions/types";
type Editor =
  | { kind: "add" }
  | { kind: "book"; book: ReadingBook }
  | { kind: "log"; bookId?: string; record?: ReadingLog; removing?: boolean }
  | { kind: "goal"; goalId?: string };
export function ReadingWorkspace({
  area,
  profile,
  data,
  planning,
  areas,
  objectives,
  start,
  bookId,
  today,
  actions,
}: {
  area: Area;
  profile: Profile;
  data: ReadingData;
  planning: PlanningData;
  areas: Area[];
  objectives: Objective[];
  start: string;
  bookId?: string;
  today: string;
  actions: AreaActionsData;
}) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [filter, setFilter] = useState<BookStatus | "ALL">("ALL");
  const [showLibrary, setShowLibrary] = useState(false);
  const [summaryGoalId, setSummaryGoalId] = useState("");
  const [notice, setNotice] = useState("");
  const saved = useCallback((message: string) => {
    setEditor(null);
    setNotice(message);
    if (message === "Livro salvo.") {
      setShowLibrary(true);
      setFilter("ALL");
    }
  }, []);
  const readingModule = data.module;
  const performance = calculatePlanning(areas, planning);
  const areaPerformance = performance.areas.find((a) => a.id === area.id)!;
  const selected = bookId ? data.books.find((b) => b.id === bookId) : null;
  const books = selected
    ? [selected]
    : data.books.filter((b) =>
        showLibrary
          ? filter === "ALL" || b.status === filter
          : b.status === "READING",
      );
  const goalIds = new Set(
    planning.sources
      .filter(
        (s) => s.kind === "MODULE" && s.area_module_id === readingModule?.id,
      )
      .map((s) => s.goal_id),
  );
  const goals = areaPerformance.goals.filter((g) => goalIds.has(g.id));
  const activeGoals = goals.filter((g) => g.goal.state === "ACTIVE");
  const summaryGoal =
    activeGoals.find((g) => g.id === summaryGoalId) ||
    activeGoals.find(
      (g) =>
        planning.sources.find((s) => s.goal_id === g.id)?.scope === "ALL_BOOKS",
    ) ||
    activeGoals[0];
  const summarySource = planning.sources.find(
    (s) => s.goal_id === summaryGoal?.id,
  );
  const editingGoal =
    editor?.kind === "goal"
      ? goals.find((g) => g.id === editor.goalId)?.goal
      : undefined;
  const editingSource = planning.sources.find(
    (s) => s.goal_id === editingGoal?.id,
  );
  return (
    <div
      className={
        "reading-workspace " +
        (selected ? "reading-detail" : "reading-dashboard")
      }
      style={{ "--area-color": area.color } as CSSProperties}
    >
      <header className="panel reading-area-heading">
        <div>
          <Link
            className="text-link reading-back"
            href={
              selected
                ? "/areas/" + area.id + "/leitura?week=" + start
                : "/areas/" + area.id + "?week=" + start + "&view=planning"
            }
          >
            <ArrowLeft size={14} />
            {selected ? "Biblioteca" : "Planejamento da área"}
          </Link>
          <div className="reading-area-title">
            <span className="reading-icon">
              <BookOpen size={31} />
            </span>
            <h1>{selected?.title || "Leitura"}</h1>
          </div>
          <p>
            {selected
              ? "Progresso e registros de leitura."
              : "Mais conhecimento, mais clareza para construir a vida que quero."}
          </p>
        </div>
        {readingModule?.enabled && (
          <button
            className="button reading-goal-button"
            onClick={() => setEditor({ kind: "goal", goalId: summaryGoal?.id })}
          >
            <Target size={22} />
            Definir meta
          </button>
        )}
      </header>
      <div role="status" className="live-notice">
        {notice}
      </div>
      {!readingModule ? (
        <section className="panel reading-enable">
          <BookOpen size={28} />
          <h2>Uma biblioteca na sua área</h2>
          <p>
            Habilite Leitura em “{area.name}”. A associação usa o ID da área;
            você pode renomeá-la a qualquer momento.
          </p>
          <ModuleForm areaId={area.id} enabled onSaved={saved} />
        </section>
      ) : (
        <div className="reading-body">
          {!readingModule.enabled && (
            <section className="panel reading-enable">
              <h2>Leitura desabilitada nesta área</h2>
              <p>
                O histórico e as metas existentes são preservados. Reative para
                adicionar livros e registros.
              </p>
              <ModuleForm areaId={area.id} enabled onSaved={saved} />
            </section>
          )}
          <details className="reading-period">
            <summary>
              {weekLabel(start)} ·{" "}
              {start === resolveWeekStart(today, profile.timezone)
                ? "Semana atual"
                : "Alterar semana"}
            </summary>
            <WeekSelector
              start={start}
              current={resolveWeekStart(today, profile.timezone)}
              timezone={planning.week?.timezone || profile.timezone}
            />
          </details>
          {!selected && (
            <ReadingOverview
              logs={data.logs}
              start={start}
              today={today}
              goal={summaryGoal?.result}
              scope={
                summarySource?.scope === "BOOK"
                  ? data.books.find((b) => b.id === summarySource.book_id)
                      ?.title
                  : undefined
              }
            />
          )}
          {!selected && (
            <section className="reading-goals">
              <div className="section-heading">
                <h2>Metas de leitura da semana</h2>
                <button
                  className="button secondary"
                  disabled={!readingModule.enabled}
                  onClick={() => setEditor({ kind: "goal" })}
                >
                  Definir meta de leitura
                </button>
              </div>
              {activeGoals.length > 1 && (
                <label className="field compact-field">
                  Meta exibida no resumo
                  <select
                    value={summaryGoal?.id || ""}
                    onChange={(e) => setSummaryGoalId(e.target.value)}
                  >
                    {activeGoals.map((g) => (
                      <option value={g.id} key={g.id}>
                        {g.goal.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {goals.length ? (
                <div className="goal-grid">
                  {goals.map((g) => (
                    <article
                      className="goal-card"
                      key={g.id}
                      data-testid={"reading-goal-" + g.goal.title}
                    >
                      <div className="section-heading">
                        <h3>{g.goal.title}</h3>
                        <button
                          className="small-icon-button"
                          aria-label={"Ajustar meta " + g.goal.title}
                          onClick={() =>
                            setEditor({ kind: "goal", goalId: g.id })
                          }
                        >
                          <Pencil size={14} />
                        </button>
                      </div>
                      <p className="field-help">
                        {planning.sources.find((s) => s.goal_id === g.id)
                          ?.scope === "BOOK"
                          ? data.books.find(
                              (b) =>
                                b.id ===
                                planning.sources.find((s) => s.goal_id === g.id)
                                  ?.book_id,
                            )?.title
                          : "Todos os livros desta área"}
                      </p>
                      <GoalNumbers
                        result={g.result}
                        unit="páginas"
                        observationUnit="dias"
                      />
                    </article>
                  ))}
                </div>
              ) : (
                <p className="muted">
                  Sem meta semanal de leitura. Seus registros já podem ser
                  feitos na biblioteca.
                </p>
              )}
            </section>
          )}
          <div
            className={
              selected ? "reading-detail-library" : "reading-bottom-grid"
            }
          >
            <section className={"reading-library " + (selected ? "" : "panel")}>
              <div className="reading-section-heading">
                <BookOpen size={23} />
                <h2>{selected ? "Seu livro" : "Livros em andamento"}</h2>
                {!selected && (
                  <button
                    className="text-link"
                    onClick={() => setShowLibrary(!showLibrary)}
                  >
                    {showLibrary ? "Em andamento" : "Ver todos"}
                    <ArrowRight size={14} />
                  </button>
                )}
              </div>
              {showLibrary && !selected && (
                <label className="field compact-field reading-book-filter">
                  Filtrar livros
                  <select
                    value={filter}
                    onChange={(e) =>
                      setFilter(e.target.value as BookStatus | "ALL")
                    }
                  >
                    <option value="ALL">Todos</option>
                    {Object.entries(BOOK_STATUS).map(([v, l]) => (
                      <option value={v} key={v}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {books.length ? (
                <div className={"book-grid " + (selected ? "detail" : "")}>
                  {books.map((b) => {
                    const ratio = b.total_pages
                      ? multiply(
                          divide(
                            decimal(b.current_page),
                            decimal(b.total_pages),
                          ),
                          HUNDRED,
                        )
                      : null;
                    return (
                      <article
                        className={"book-card " + (selected ? "panel" : "")}
                        key={b.id}
                        data-testid={"book-" + b.title}
                      >
                        <div className="book-card-main">
                          <BookCover url={b.cover_url} title={b.title} />
                          <div className="book-info">
                            {(selected || showLibrary) && (
                              <span className="pill">
                                {BOOK_STATUS[b.status]}
                              </span>
                            )}
                            <h3>
                              {selected ? (
                                b.title
                              ) : (
                                <Link
                                  href={
                                    "/areas/" +
                                    area.id +
                                    "/leitura/" +
                                    b.id +
                                    "?week=" +
                                    start
                                  }
                                >
                                  {b.title}
                                </Link>
                              )}
                            </h3>
                            <p>
                              {b.authors.join(", ") || "Autor não informado"}
                            </p>
                            <div
                              className={selected ? "book-position" : "sr-only"}
                              data-testid="book-progress"
                            >
                              <strong>{b.current_page}</strong> /{" "}
                              {b.total_pages ?? "total desconhecido"}
                              {b.total_pages ? " páginas" : ""}
                            </div>
                            <div className="reading-book-progress">
                              {ratio ? (
                                <>
                                  <ProgressBar
                                    value={approximate(ratio)}
                                    label={"Progresso de " + b.title}
                                  />
                                  <span className="field-help">
                                    {formatPercent(ratio)}
                                  </span>
                                </>
                              ) : (
                                <span className="field-help">
                                  Total de páginas não informado
                                </span>
                              )}
                            </div>
                            {!selected && b.total_pages !== null && (
                              <p className="reading-pages-left">
                                Faltam{" "}
                                {Math.max(0, b.total_pages - b.current_page)}{" "}
                                páginas
                              </p>
                            )}
                            {selected && (
                              <p className="field-help">
                                Acompanhamento iniciado na página{" "}
                                {b.initial_tracking_page}.
                              </p>
                            )}
                          </div>
                          {!selected && (
                            <Link
                              className="reading-book-detail"
                              href={
                                "/areas/" +
                                area.id +
                                "/leitura/" +
                                b.id +
                                "?week=" +
                                start
                              }
                              aria-label={"Detalhes de " + b.title}
                            >
                              <ChevronRight size={18} />
                            </Link>
                          )}
                        </div>
                        <div className="book-card-actions">
                          <button
                            className="button secondary"
                            disabled={!readingModule.enabled}
                            onClick={() =>
                              setEditor({ kind: "log", bookId: b.id })
                            }
                          >
                            Registrar leitura
                          </button>
                          <button
                            className="small-icon-button"
                            aria-label={"Editar livro " + b.title}
                            onClick={() => setEditor({ kind: "book", book: b })}
                          >
                            <Pencil size={16} />
                          </button>
                        </div>
                        {b.total_pages !== null &&
                          b.current_page === b.total_pages &&
                          b.status !== "FINISHED" && (
                            <div className="finish-suggestion">
                              <p>Você chegou ao total de páginas.</p>
                              <button
                                className="text-link"
                                onClick={() =>
                                  setEditor({
                                    kind: "book",
                                    book: { ...b, status: "FINISHED" },
                                  })
                                }
                              >
                                Marcar como concluído
                              </button>
                            </div>
                          )}
                        {selected && (
                          <>
                            <p className="field-help">
                              {b.isbn_10 ? "ISBN-10: " + b.isbn_10 : ""}{" "}
                              {b.isbn_13 ? "ISBN-13: " + b.isbn_13 : ""}
                            </p>
                            {data.references.some(
                              (r) => r.book_id === b.id,
                            ) && (
                              <p className="field-help">
                                Cadastro iniciado com Open Library. Metadados
                                editáveis e independentes do catálogo.
                              </p>
                            )}
                          </>
                        )}
                      </article>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  title={
                    data.books.length
                      ? "Nenhum livro em andamento neste filtro"
                      : "Sua biblioteca começa aqui"
                  }
                >
                  Adicione um livro manualmente ou busque no catálogo. Nenhum
                  dado de exemplo é criado.
                </EmptyState>
              )}
              {!selected && readingModule.enabled && (
                <div className="reading-library-tools">
                  <button
                    className="text-link"
                    onClick={() => setEditor({ kind: "add" })}
                  >
                    <Plus size={14} />
                    Adicionar livro
                  </button>
                  <button
                    className="text-link"
                    disabled={!data.books.length}
                    onClick={() => setEditor({ kind: "log" })}
                  >
                    Registrar leitura
                  </button>
                </div>
              )}
            </section>

            {!selected && (
              <AreaActionsCard
                data={actions}
                areaId={area.id}
                areaName={area.name}
                books={data.books}
                objectives={objectives}
                today={today}
                timezone={profile.timezone}
              />
            )}
          </div>
          <section className="panel reading-history">
            <h2>{selected ? "Histórico de leitura" : "Registros recentes"}</h2>
            {data.logs
              .filter(
                (l) =>
                  !l.is_deleted && (!selected || l.book_id === selected.id),
              )
              .slice(0, 50)
              .map((l) => (
                <div className="reading-history-row" key={l.id}>
                  <div>
                    <strong>
                      {new Intl.DateTimeFormat("pt-BR", {
                        timeZone: "UTC",
                      }).format(new Date(l.read_on + "T12:00:00Z"))}{" "}
                      · +{l.pages} páginas
                    </strong>
                    <span>
                      {data.books.find((b) => b.id === l.book_id)?.title}
                    </span>
                  </div>
                  <button
                    className="small-icon-button"
                    aria-label={
                      "Editar leitura " + l.read_on + " " + l.pages + " páginas"
                    }
                    onClick={() => setEditor({ kind: "log", record: l })}
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    className="small-icon-button delete-button"
                    aria-label={
                      "Remover leitura " +
                      l.read_on +
                      " " +
                      l.pages +
                      " páginas"
                    }
                    onClick={() =>
                      setEditor({ kind: "log", record: l, removing: true })
                    }
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            {!data.logs.some(
              (l) => !l.is_deleted && (!selected || l.book_id === selected.id),
            ) && <p className="muted">Nenhuma leitura registrada ainda.</p>}
          </section>
          {!selected && readingModule.enabled && (
            <details className="module-settings">
              <summary>Configuração do módulo</summary>
              <p>
                Desabilitar impede novos registros e cadastros. O histórico
                continua acessível e as metas existentes continuam calculando.
              </p>
              <ModuleForm areaId={area.id} enabled={false} onSaved={saved} />
            </details>
          )}
        </div>
      )}
      {editor && readingModule && (
        <Modal
          title={
            editor.kind === "add"
              ? "Adicionar livro"
              : editor.kind === "book"
                ? "Editar livro"
                : editor.kind === "goal"
                  ? editingGoal
                    ? "Editar meta semanal de leitura"
                    : "Nova meta semanal de leitura"
                  : editor.removing
                    ? "Remover leitura?"
                    : editor.record
                      ? "Corrigir leitura"
                      : "Registrar leitura"
          }
          onClose={() => setEditor(null)}
        >
          {editor.kind === "add" ? (
            <AddBook module={readingModule} onSaved={saved} />
          ) : editor.kind === "book" ? (
            <BookForm
              module={readingModule}
              book={editor.book}
              onSaved={saved}
            />
          ) : editor.kind === "goal" ? (
            <GoalForm
              areaId={area.id}
              start={start}
              objectives={objectives}
              goal={editingGoal}
              source={editingSource}
              locked={
                !!editingGoal &&
                data.logs.some(
                  (l) =>
                    !l.is_deleted &&
                    (!editingSource?.book_id ||
                      l.book_id === editingSource.book_id),
                )
              }
              readingModule={readingModule}
              readingBooks={data.books}
              initialMeasurement="MODULE"
              onSaved={saved}
            />
          ) : (
            <ReadingLogForm
              books={data.books}
              bookId={editor.bookId}
              record={editor.record}
              removing={editor.removing}
              timezone={profile.timezone}
              onSaved={saved}
              onAddBook={() => setEditor({ kind: "add" })}
            />
          )}
        </Modal>
      )}
    </div>
  );
}
