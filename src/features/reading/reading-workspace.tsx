"use client";
import Link from "next/link";
import { useCallback, useState, type CSSProperties } from "react";
import { Plus, Pencil, Trash2, BookOpen, ArrowLeft } from "lucide-react";
import type { Area, Profile } from "@/types/database";
import type { PlanningData, Objective } from "@/features/planning/types";
import { calculatePlanning } from "@/features/planning/normalize";
import { GoalForm } from "@/features/planning/goal-forms";
import {
  GoalNumbers,
  ScoreBadge,
  ProgressBar,
} from "@/components/data/performance";
import { Modal } from "@/components/ui/modal";
import { PageHeading } from "@/components/ui/page-heading";
import { EmptyState } from "@/components/ui/empty-state";
import { WeekSelector } from "@/components/navigation/week-selector";
import { resolveWeekStart, addDays } from "@/lib/dates/weeks";
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
type Editor =
  | { kind: "add" }
  | { kind: "book"; book: ReadingBook }
  | { kind: "log"; bookId?: string; record?: ReadingLog; removing?: boolean }
  | { kind: "goal" };
export function ReadingWorkspace({
  area,
  profile,
  data,
  planning,
  areas,
  objectives,
  start,
  bookId,
}: {
  area: Area;
  profile: Profile;
  data: ReadingData;
  planning: PlanningData;
  areas: Area[];
  objectives: Objective[];
  start: string;
  bookId?: string;
}) {
  const [editor, setEditor] = useState<Editor | null>(null);
  const [filter, setFilter] = useState<BookStatus | "ALL">("ALL");
  const [notice, setNotice] = useState("");
  const saved = useCallback((message: string) => {
    setEditor(null);
    setNotice(message);
  }, []);
  const readingModule = data.module;
  const performance = calculatePlanning(areas, planning);
  const areaPerformance = performance.areas.find((a) => a.id === area.id)!;
  const weeklyLogs = data.logs.filter(
    (l) => !l.is_deleted && l.read_on >= start && l.read_on < addDays(start, 7),
  );
  const pages = weeklyLogs.reduce((s, l) => s + l.pages, 0);
  const selected = bookId ? data.books.find((b) => b.id === bookId) : null;
  const books = selected
    ? [selected]
    : data.books.filter((b) => filter === "ALL" || b.status === filter);
  const goalIds = new Set(
    planning.sources
      .filter(
        (s) => s.kind === "MODULE" && s.area_module_id === readingModule?.id,
      )
      .map((s) => s.goal_id),
  );
  const goals = areaPerformance.goals.filter((g) => goalIds.has(g.id));
  return (
    <div
      className="reading-workspace"
      style={{ "--area-color": area.color } as CSSProperties}
    >
      <Link
        className="text-link"
        href={
          selected
            ? "/areas/" + area.id + "/leitura?week=" + start
            : "/areas/" + area.id + "?week=" + start
        }
      >
        <ArrowLeft size={14} />
        {selected ? "Biblioteca" : "Planejamento da área"}
      </Link>
      <PageHeading
        eyebrow={area.name + " · LEITURA"}
        title={selected?.title || "Leitura e estudos"}
        description={
          selected
            ? "Progresso e registros de leitura."
            : "Sua biblioteca, uma página de cada vez."
        }
        action={
          readingModule?.enabled ? (
            <div className="reading-actions">
              <button
                className="button secondary"
                onClick={() => setEditor({ kind: "add" })}
              >
                <Plus size={15} />
                Adicionar livro
              </button>
              <button
                className="button primary"
                disabled={!data.books.length}
                onClick={() => setEditor({ kind: "log", bookId: selected?.id })}
              >
                Registrar leitura
              </button>
            </div>
          ) : undefined
        }
      />
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
        <>
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
          <WeekSelector
            start={start}
            current={resolveWeekStart(undefined, profile.timezone)}
            timezone={planning.week?.timezone || profile.timezone}
          />
          {!selected && (
            <section className="reading-summary panel">
              <div>
                <span className="eyebrow">PÁGINAS NESTA SEMANA</span>
                <strong data-testid="reading-week-pages">{pages}</strong>
                <span>Somente leitura registrada</span>
              </div>
              <div>
                <span className="eyebrow">DESEMPENHO DA ÁREA</span>
                <ScoreBadge result={areaPerformance.result} />
                <Link
                  className="text-link"
                  href={"/areas/" + area.id + "?week=" + start}
                >
                  Ver composição
                </Link>
              </div>
              <div>
                <span className="eyebrow">LENDO AGORA</span>
                <strong>
                  {data.books.filter((b) => b.status === "READING").length}
                </strong>
                <span>livros em leitura</span>
              </div>
            </section>
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
              {goals.length ? (
                <div className="goal-grid">
                  {goals.map((g) => (
                    <article
                      className="goal-card"
                      key={g.id}
                      data-testid={"reading-goal-" + g.goal.title}
                    >
                      <h3>{g.goal.title}</h3>
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
          <section className="reading-library">
            <div className="section-heading">
              <h2>{selected ? "Seu livro" : "Biblioteca"}</h2>
              {!selected && (
                <label className="field compact-field">
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
            </div>
            {books.length ? (
              <div className={"book-grid " + (selected ? "detail" : "")}>
                {books.map((b) => {
                  const ratio = b.total_pages
                    ? multiply(
                        divide(decimal(b.current_page), decimal(b.total_pages)),
                        HUNDRED,
                      )
                    : null;
                  return (
                    <article
                      className="book-card panel"
                      key={b.id}
                      data-testid={"book-" + b.title}
                    >
                      <div className="book-card-main">
                        <BookCover url={b.cover_url} title={b.title} />
                        <div className="book-info">
                          <span className="pill">{BOOK_STATUS[b.status]}</span>
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
                          <p>{b.authors.join(", ") || "Autor não informado"}</p>
                          <div
                            className="book-position"
                            data-testid="book-progress"
                          >
                            <strong>{b.current_page}</strong> /{" "}
                            {b.total_pages ?? "total desconhecido"}
                            {b.total_pages ? " páginas" : ""}
                          </div>
                          {ratio && (
                            <>
                              <ProgressBar
                                value={approximate(ratio)}
                                label={"Progresso de " + b.title}
                              />
                              <span className="field-help">
                                {formatPercent(ratio)}
                              </span>
                            </>
                          )}
                          <p className="field-help">
                            Acompanhamento iniciado na página{" "}
                            {b.initial_tracking_page}.
                          </p>
                        </div>
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
                          {data.references.some((r) => r.book_id === b.id) && (
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
                    ? "Nenhum livro neste filtro"
                    : "Sua biblioteca começa aqui"
                }
              >
                Adicione um livro manualmente ou busque no catálogo. Nenhum dado
                de exemplo é criado.
              </EmptyState>
            )}
          </section>
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
        </>
      )}
      {editor && readingModule && (
        <Modal
          title={
            editor.kind === "add"
              ? "Adicionar livro"
              : editor.kind === "book"
                ? "Editar livro"
                : editor.kind === "goal"
                  ? "Nova meta semanal de leitura"
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
              locked={false}
              readingModule={readingModule}
              readingBooks={data.books}
              source={{
                goal_id: "",
                user_id: "",
                kind: "MODULE",
                created_at: "",
                module: "READING",
                metric: "PAGES_READ",
                scope: "ALL_BOOKS",
                area_module_id: readingModule.id,
              }}
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
            />
          )}
        </Modal>
      )}
    </div>
  );
}
