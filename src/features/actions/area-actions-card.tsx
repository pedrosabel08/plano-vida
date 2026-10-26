"use client";
import {
  type ChangeEvent,
  useActionState,
  useCallback,
  useEffect,
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, ListTodo, Plus } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { INITIAL_STATE } from "@/types/actions";
import { addDays } from "@/lib/dates/weeks";
import type { ReadingBook } from "@/features/reading/types";
import type { Objective } from "@/features/planning/types";
import type { AreaAction, AreaActionsData } from "./types";
import { completeAreaAction, saveAreaAction } from "./actions";

function ActionForm({
  item,
  areaId,
  books,
  objectives,
  timezone,
  onSaved,
  showBooks = true,
}: {
  item?: AreaAction;
  areaId: string;
  books: ReadingBook[];
  objectives: Objective[];
  timezone: string;
  onSaved: (message: string) => void;
  showBooks?: boolean;
}) {
  const [state, action, pending] = useActionState(
    saveAreaAction,
    INITIAL_STATE,
  );
  const [id] = useState(() => item?.id || crypto.randomUUID());
  const [draft, setDraft] = useState({
    title: item?.title || "",
    book_id: item?.book_id || "",
    objective_id: item?.objective_id || "",
    due_on: item?.due_on || "",
    due_time: item?.due_time?.slice(0, 5) || "",
    completed: String(item?.completed || false),
  });
  const change =
    (key: keyof typeof draft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setDraft((current) => ({ ...current, [key]: event.target.value }));
  useEffect(() => {
    if (state.status === "success") onSaved(state.message || "Ação salva.");
  }, [state, onSaved]);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="area_id" value={areaId} />
      <input
        type="hidden"
        name="expected_updated_at"
        value={item?.updated_at || ""}
      />
      <label className="field">
        Título da ação
        <input
          name="title"
          required
          maxLength={160}
          value={draft.title}
          onChange={change("title")}
        />
      </label>
      {showBooks ? (
        <label className="field">
          Livro relacionado
          <select
            name="book_id"
            value={draft.book_id}
            onChange={change("book_id")}
          >
            <option value="">Sem livro</option>
            {books.map((b) => (
              <option value={b.id} key={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <input type="hidden" name="book_id" value="" />
      )}
      <label className="field">
        Objetivo relacionado
        <select
          name="objective_id"
          value={draft.objective_id}
          onChange={change("objective_id")}
        >
          <option value="">Sem objetivo</option>
          {objectives
            .filter((o) => !o.area_id || o.area_id === areaId)
            .map((o) => (
              <option value={o.id} key={o.id}>
                {o.title}
              </option>
            ))}
        </select>
      </label>
      <div className="form-grid">
        <label className="field">
          Data da ação
          <input
            type="date"
            name="due_on"
            value={draft.due_on}
            onChange={change("due_on")}
            min="1900-01-01"
            max="9999-12-31"
          />
        </label>
        <label className="field">
          Horário da ação
          <input
            type="time"
            name="due_time"
            value={draft.due_time}
            onChange={change("due_time")}
          />
        </label>
      </div>
      <p className="field-help">
        Data e horário em {timezone}. Informe uma data se definir um horário.
      </p>
      <label className="field">
        Situação da ação
        <select
          name="completed"
          value={draft.completed}
          onChange={change("completed")}
        >
          <option value="false">Pendente</option>
          <option value="true">Concluída</option>
        </select>
      </label>
      <p role="alert" className="form-message error">
        {state.status === "error" ? state.message : ""}
      </p>
      <button className="button primary" disabled={pending}>
        {pending ? "Salvando…" : "Salvar ação"}
      </button>
    </form>
  );
}
function ActionRow({
  item,
  book,
  areaName,
  today,
  onOpen,
  onNotice,
}: {
  item: AreaAction;
  book?: ReadingBook;
  areaName: string;
  today: string;
  onOpen: () => void;
  onNotice: (message: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const date = !item.due_on
    ? "Sem data"
    : item.due_on === today
      ? "Hoje"
      : item.due_on === addDays(today, 1)
        ? "Amanhã"
        : new Intl.DateTimeFormat("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            timeZone: "UTC",
          }).format(new Date(item.due_on + "T12:00:00Z"));
  return (
    <li
      className={"reading-action-item " + (item.completed ? "completed" : "")}
    >
      <div className="reading-action-row">
        <button
          className="reading-action-check"
          aria-label={
            (item.completed ? "Reabrir ação " : "Concluir ação ") + item.title
          }
          aria-pressed={item.completed}
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError("");
              try {
                const result = await completeAreaAction(
                  item.id,
                  !item.completed,
                  item.updated_at,
                );
                if (result.status === "error")
                  setError(result.message || "Não foi possível salvar.");
                else onNotice(result.message || "Ação atualizada.");
              } catch {
                setError("Não foi possível salvar a ação. Tente novamente.");
              }
            })
          }
        >
          {item.completed && <Check size={17} strokeWidth={3} />}
        </button>
        <span className={"reading-action-dot " + (book ? "has-book" : "")} />
        <button className="reading-action-open" onClick={onOpen}>
          <strong>{item.title}</strong>
          <span>
            {book?.title || areaName} <i>·</i> {date}
          </span>
        </button>
        {item.due_time && (
          <time dateTime={`${item.due_on}T${item.due_time}`}>
            {item.due_time.slice(0, 5)}
          </time>
        )}
      </div>
      {error && (
        <p role="alert" className="form-message error">
          {error}
        </p>
      )}
    </li>
  );
}
export function AreaActionsCard({
  data,
  areaId,
  areaName,
  books,
  objectives,
  today,
  timezone,
  contextLabel = "leitura",
  showBooks = true,
}: {
  data: AreaActionsData;
  areaId: string;
  areaName: string;
  books: ReadingBook[];
  objectives: Objective[];
  today: string;
  timezone: string;
  contextLabel?: string;
  showBooks?: boolean;
}) {
  const [editor, setEditor] = useState<AreaAction | "new" | null>(null);
  const [all, setAll] = useState(false);
  const [notice, setNotice] = useState("");
  const router = useRouter();
  const saved = useCallback((message: string) => {
    setEditor(null);
    setNotice(message);
  }, []);
  const items = all ? data.items : data.items.slice(0, 5);
  return (
    <section
      className="panel reading-next-actions"
      aria-labelledby="reading-actions-title"
    >
      <div className="reading-section-heading">
        <ListTodo size={23} />
        <h2 id="reading-actions-title">Próximas ações</h2>
        <button className="text-link" onClick={() => setAll(!all)}>
          {all ? "Ver próximas" : "Ver todas"}
          <ArrowRight size={14} />
        </button>
      </div>
      {data.error ? (
        <div className="reading-card-empty">
          <p role="alert">{data.error}</p>
          <button className="text-link" onClick={() => router.refresh()}>
            Tentar novamente
          </button>
        </div>
      ) : (
        <>
          {items.length ? (
            <ul className="reading-action-list">
              {items.map((item) => (
                <ActionRow
                  key={item.id}
                  item={item}
                  book={books.find((b) => b.id === item.book_id)}
                  areaName={areaName}
                  today={today}
                  onOpen={() => setEditor(item)}
                  onNotice={setNotice}
                />
              ))}
            </ul>
          ) : (
            <div className="reading-card-empty">
              <ListTodo size={26} />
              <p>Nenhuma ação por aqui.</p>
              <span>
                {contextLabel === "leitura"
                  ? "Planeje o próximo passo da sua leitura."
                  : `Planeje o próximo passo de ${contextLabel}.`}
              </span>
            </div>
          )}
          <button
            className="text-link reading-add-action"
            onClick={() => setEditor("new")}
          >
            <Plus size={14} />
            Adicionar ação
          </button>
        </>
      )}
      <p role="status" className="live-notice">
        {notice}
      </p>
      {editor && (
        <Modal
          title={editor === "new" ? "Nova ação" : "Detalhes da ação"}
          onClose={() => setEditor(null)}
        >
          <ActionForm
            item={editor === "new" ? undefined : editor}
            areaId={areaId}
            books={books}
            objectives={objectives}
            timezone={timezone}
            showBooks={showBooks}
            onSaved={saved}
          />
        </Modal>
      )}
    </section>
  );
}
