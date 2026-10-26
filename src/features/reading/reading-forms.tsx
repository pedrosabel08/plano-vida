"use client";
import { useActionState, useEffect, useState } from "react";
import { INITIAL_STATE } from "@/types/actions";
import { saveBook, saveReadingLog, configureReading } from "./actions";
import type { ReadingBook, ReadingLog, AreaModule } from "./types";
import { BOOK_STATUS } from "./types";
import type { CatalogBook } from "@/services/book-catalog/provider";
import { todayInTimezone } from "@/lib/dates/weeks";
import { BookCover } from "./book-cover";
type Saved = (message: string) => void;
export function ModuleForm({
  areaId,
  enabled,
  onSaved,
}: {
  areaId: string;
  enabled: boolean;
  onSaved: Saved;
}) {
  const [s, a, p] = useActionState(configureReading, INITIAL_STATE);
  useEffect(() => {
    if (s.status === "success") onSaved(s.message || "Módulo atualizado.");
  }, [s, onSaved]);
  return (
    <form action={a} className="stack">
      <input type="hidden" name="area_id" value={areaId} />
      <input type="hidden" name="enabled" value={String(enabled)} />
      <p role="alert" className="form-message error">
        {s.message}
      </p>
      <button className="button secondary" disabled={p}>
        {enabled ? "Habilitar Leitura" : "Desabilitar Leitura"}
      </button>
    </form>
  );
}
export function BookForm({
  module,
  book,
  seed,
  onSaved,
}: {
  module: AreaModule;
  book?: ReadingBook;
  seed?: CatalogBook;
  onSaved: Saved;
}) {
  const [s, a, p] = useActionState(saveBook, INITIAL_STATE);
  useEffect(() => {
    if (s.status === "success") onSaved(s.message || "Livro salvo.");
  }, [s, onSaved]);
  return (
    <form action={a} className="stack">
      <input type="hidden" name="id" value={book?.id || ""} />
      <input type="hidden" name="area_module_id" value={module.id} />
      <input
        type="hidden"
        name="expected_updated_at"
        value={book?.updated_at || ""}
      />
      {seed && (
        <>
          <input
            type="hidden"
            name="external_reference"
            value={JSON.stringify({
              provider: seed.provider,
              external_id: seed.externalId,
              looked_up_at: seed.lookedUpAt,
              metadata: { suggested_pages: seed.pageCount },
            })}
          />
          <p className="inline-alert">
            Revise título, autores, ISBN e paginação da sua edição antes de
            salvar. Os dados do catálogo são sugestões.
          </p>
        </>
      )}
      <label className="field">
        Título do livro
        <input
          name="title"
          defaultValue={book?.title || seed?.title || ""}
          required
          maxLength={200}
        />
      </label>
      <label className="field">
        Autores
        <input
          name="authors"
          defaultValue={(book?.authors || seed?.authors || []).join("; ")}
          maxLength={3220}
          placeholder="Separe autores com ponto e vírgula"
        />
      </label>
      <div className="form-grid">
        <label className="field">
          Total de páginas
          <input
            type="number"
            name="total_pages"
            min={1}
            max={2147483647}
            defaultValue={book?.total_pages ?? seed?.pageCount ?? ""}
            placeholder="Opcional, se desconhecido"
          />
        </label>
        <label className="field">
          Página inicial de acompanhamento
          <input
            type="number"
            name="initial_tracking_page"
            min={0}
            max={2147483647}
            defaultValue={book?.initial_tracking_page ?? 0}
            required
          />
        </label>
      </div>
      <p className="field-help">
        A página inicial não conta como leitura da semana. A página atual é
        derivada dos registros; não há reinício ou releitura nesta versão.
      </p>
      <label className="field">
        Status do livro
        <select name="status" defaultValue={book?.status || "READING"}>
          {Object.entries(BOOK_STATUS).map(([v, l]) => (
            <option value={v} key={v}>
              {l}
            </option>
          ))}
        </select>
      </label>
      <details className="optional-book-fields">
        <summary>Capa e ISBN opcionais</summary>
        <div className="stack">
          <label className="field">
            URL da capa
            <input
              type="url"
              name="cover_url"
              defaultValue={book?.cover_url || seed?.coverUrl || ""}
              placeholder="https://"
              maxLength={2048}
            />
          </label>
          <div className="form-grid">
            <label className="field">
              ISBN-10
              <input
                name="isbn_10"
                defaultValue={book?.isbn_10 || seed?.isbn10 || ""}
                maxLength={30}
              />
            </label>
            <label className="field">
              ISBN-13
              <input
                name="isbn_13"
                defaultValue={book?.isbn_13 || seed?.isbn13 || ""}
                maxLength={30}
              />
            </label>
          </div>
        </div>
      </details>
      <p role="alert" className="form-message error">
        {s.message}
      </p>
      <button className="button primary full-width" disabled={p}>
        {p ? "Salvando…" : "Salvar livro"}
      </button>
    </form>
  );
}
export function AddBook({
  module,
  onSaved,
}: {
  module: AreaModule;
  onSaved: Saved;
}) {
  const [manual, setManual] = useState(false);
  const [seed, setSeed] = useState<CatalogBook>();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogBook[]>([]);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  async function search() {
    setPending(true);
    setMessage("");
    setResults([]);
    try {
      const r = await fetch(
        "/api/book-catalog?q=" + encodeURIComponent(query),
        { signal: AbortSignal.timeout(9000) },
      );
      const body = await r.json();
      if (!r.ok) throw new Error(body.error);
      setResults(body.books);
      if (!body.books.length)
        setMessage("Nenhum resultado. Você pode adicionar manualmente.");
    } catch {
      setMessage("A busca está indisponível. Você pode adicionar manualmente.");
    } finally {
      setPending(false);
    }
  }
  if (manual || seed)
    return (
      <>
        <button
          className="text-link"
          onClick={() => {
            setManual(false);
            setSeed(undefined);
          }}
        >
          Voltar à busca
        </button>
        <BookForm
          key={seed?.externalId || "manual"}
          module={module}
          seed={seed}
          onSaved={onSaved}
        />
      </>
    );
  return (
    <div className="stack">
      <button className="button secondary" onClick={() => setManual(true)}>
        Adicionar manualmente
      </button>
      <form
        className="catalog-search"
        onSubmit={(e) => {
          e.preventDefault();
          void search();
        }}
      >
        <label className="field">
          Título, autor ou ISBN
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            minLength={2}
            maxLength={120}
            required
          />
        </label>
        <button className="button primary" disabled={pending}>
          {pending ? "Buscando…" : "Buscar livros"}
        </button>
      </form>
      <p className="field-help">
        Busca por Open Library. A página total pode representar outra edição;
        revise os dados.
      </p>
      <p role="status">{message}</p>
      <div className="catalog-results">
        {results.map((r) => (
          <button
            className="catalog-result"
            key={r.externalId}
            onClick={() => setSeed(r)}
          >
            <BookCover url={r.coverUrl} title={r.title} />
            <span>
              <strong>{r.title}</strong>
              <span>{r.authors.join(", ") || "Autor não informado"}</span>
              <span>
                {r.pageCount
                  ? r.pageCount + " páginas sugeridas"
                  : "Paginação não informada"}
              </span>
            </span>
            <span>Selecionar</span>
          </button>
        ))}
      </div>
    </div>
  );
}
export function ReadingLogForm({
  books,
  bookId,
  record,
  removing = false,
  timezone,
  onSaved,
  goalId,
  onAddBook,
}: {
  books: ReadingBook[];
  bookId?: string;
  record?: ReadingLog;
  removing?: boolean;
  timezone: string;
  onSaved: Saved;
  goalId?: string;
  onAddBook?: () => void;
}) {
  const [s, a, p] = useActionState(
    saveReadingLog.bind(null, goalId || null),
    INITIAL_STATE,
  );
  const [operation] = useState(
    () => record?.operation_id || crypto.randomUUID(),
  );
  useEffect(() => {
    if (s.status === "success") onSaved(s.message || "Leitura registrada.");
  }, [s, onSaved]);
  const fixedBookId = record?.book_id || bookId;
  if (
    !removing &&
    (!books.length || (fixedBookId && !books.some((b) => b.id === fixedBookId)))
  ) {
    return (
      <div className="stack">
        <p>
          Nenhum livro disponível. Adicione um livro antes de registrar uma
          leitura.
        </p>
        {onAddBook && (
          <button className="button primary" onClick={onAddBook}>
            Adicionar livro
          </button>
        )}
      </div>
    );
  }
  return (
    <form action={a} className="stack">
      <input type="hidden" name="id" value={record?.id || ""} />
      <input type="hidden" name="operation_id" value={operation} />
      <input
        type="hidden"
        name="expected_updated_at"
        value={record?.updated_at || ""}
      />
      <input type="hidden" name="is_deleted" value={String(removing)} />
      {removing ? (
        <>
          <input type="hidden" name="book_id" value={record?.book_id} />
          <input type="hidden" name="read_on" value={record?.read_on} />
          <input type="hidden" name="pages" value={record?.pages} />
          <p>
            Remover este registro de {record?.pages} páginas? O progresso e o
            desempenho operacional serão recalculados.
          </p>
        </>
      ) : (
        <>
          <label className="field">
            Livro da leitura
            <select
              name="book_id"
              required
              defaultValue={
                record?.book_id ||
                bookId ||
                books.find((b) => b.status === "READING")?.id ||
                books[0]?.id
              }
              disabled={!!fixedBookId}
            >
              {books.map((b) => (
                <option value={b.id} key={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </label>
          {fixedBookId && (
            <input type="hidden" name="book_id" value={fixedBookId} />
          )}
          <label className="field">
            Data da leitura
            <input
              type="date"
              name="read_on"
              defaultValue={
                record?.read_on || todayInTimezone(new Date(), timezone)
              }
              required
            />
          </label>
          <label className="field">
            Páginas lidas
            <input
              autoFocus
              name="pages"
              type="number"
              min={1}
              max={2147483647}
              step={1}
              defaultValue={record?.pages || ""}
              required
              inputMode="numeric"
              placeholder="Quantas páginas você leu?"
            />
          </label>
          <p className="field-help">
            Registre páginas lidas, não a posição atual do livro.
          </p>
        </>
      )}
      <p role="alert" className="form-message error">
        {s.message}
      </p>
      <button
        className={
          "button " + (removing ? "danger" : "primary") + " full-width"
        }
        disabled={p}
      >
        {p
          ? "Salvando…"
          : removing
            ? "Confirmar remoção da leitura"
            : "Salvar leitura"}
      </button>
    </form>
  );
}
