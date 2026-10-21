"use client";
import Link from "next/link";
import {
  useActionState,
  useCallback,
  useEffect,
  useState,
  useTransition,
  type CSSProperties,
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
  Trash2,
  LayoutGrid,
  LoaderCircle,
} from "lucide-react";
import type { Area } from "@/types/database";
import { AREA_COLORS, AREA_ICONS, ICON_LABELS } from "./constants";
import { saveArea, deleteArea, reorderAreas } from "./actions";
import { AreaIcon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeading } from "@/components/ui/page-heading";
import { INITIAL_STATE } from "@/types/actions";
function AreaForm({
  area,
  onSaved,
}: {
  area?: Area;
  onSaved: (message: string) => void;
}) {
  const [state, action, pending] = useActionState(saveArea, INITIAL_STATE);
  const [name, setName] = useState(area?.name || "");
  const [icon, setIcon] = useState(area?.icon || "leaf");
  const [color, setColor] = useState(area?.color || AREA_COLORS[0]);
  useEffect(() => {
    if (state.status === "success") onSaved(state.message || "Área salva.");
  }, [state, onSaved]);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="id" value={area?.id || ""} />
      <div
        className="area-preview"
        style={{ "--area-color": color } as CSSProperties}
      >
        <span className="area-icon">
          <AreaIcon name={icon} size={25} />
        </span>
        <div>
          <span className="eyebrow">SUA ÁREA</span>
          <strong>{name.trim() || "Um novo espaço"}</strong>
        </div>
      </div>
      <label className="field">
        Nome da área
        <input
          name="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          required
          placeholder="Ex.: Aprendizado"
          autoComplete="off"
        />
      </label>
      <fieldset className="choice-field">
        <legend>Ícone</legend>
        <div className="icon-options">
          {AREA_ICONS.map((value) => (
            <label
              key={value}
              className="icon-option"
              title={ICON_LABELS[value]}
            >
              <input
                type="radio"
                name="icon"
                value={value}
                checked={icon === value}
                onChange={() => setIcon(value)}
                aria-label={ICON_LABELS[value]}
              />
              <AreaIcon name={value} size={21} />
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="choice-field">
        <legend>Cor da área</legend>
        <div className="color-options">
          {AREA_COLORS.map((value) => (
            <button
              type="button"
              key={value}
              className="color-swatch"
              aria-label={"Cor " + value}
              aria-pressed={color.toUpperCase() === value}
              style={{ "--swatch": value } as CSSProperties}
              onClick={() => setColor(value)}
            />
          ))}
          <label className="custom-color" title="Escolher outra cor">
            <input
              type="color"
              name="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              aria-label="Cor personalizada"
            />
            <Plus size={16} />
          </label>
        </div>
      </fieldset>
      <p role="alert" className="form-message error">
        {state.status === "error" ? state.message : ""}
      </p>
      <button className="button primary full-width" disabled={pending}>
        {pending ? (
          <>
            <LoaderCircle size={17} className="spin" />
            Salvando…
          </>
        ) : area ? (
          "Salvar alterações"
        ) : (
          "Criar área"
        )}
      </button>
    </form>
  );
}
function DeleteAreaForm({
  area,
  onSaved,
}: {
  area: Area;
  onSaved: (message: string) => void;
}) {
  const [state, action, pending] = useActionState(deleteArea, INITIAL_STATE);
  useEffect(() => {
    if (state.status === "success") onSaved(state.message || "Área removida.");
  }, [state, onSaved]);
  return (
    <form action={action} className="stack">
      <input type="hidden" name="id" value={area.id} />
      <p className="muted">
        A área <strong className="text-primary">{area.name}</strong> será
        removida da sua organização. Esta ação não pode ser desfeita.
      </p>
      <p role="alert" className="form-message error">
        {state.message}
      </p>
      <button disabled={pending} className="button danger full-width">
        {pending ? "Removendo…" : "Confirmar exclusão"}
      </button>
    </form>
  );
}
export function AreaManager({ areas }: { areas: Area[] }) {
  const router = useRouter();
  const [editor, setEditor] = useState<Area | "new" | null>(null);
  const [removing, setRemoving] = useState<Area | null>(null);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const onSaved = useCallback(
    (message: string) => {
      setEditor(null);
      setRemoving(null);
      setNotice(message);
      router.refresh();
    },
    [router],
  );
  function move(index: number, delta: number) {
    const ids = areas.map((a) => a.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    startTransition(async () => {
      const result = await reorderAreas(ids);
      setNotice(result.message || "");
      router.refresh();
    });
  }
  return (
    <>
      <PageHeading
        eyebrow="ORGANIZE O QUE IMPORTA"
        title="Minhas áreas"
        description="Dê espaço para cada parte da sua vida."
        action={
          <button className="button primary" onClick={() => setEditor("new")}>
            <Plus size={18} />
            Nova área
          </button>
        }
      />
      <div role="status" className="live-notice">
        {notice}
      </div>
      {areas.length ? (
        <>
          <div className="section-heading">
            <div className="section-label">
              <LayoutGrid size={17} />
              <h2>Seu mapa pessoal</h2>
            </div>
            <span className="count-label">
              {areas.length} {areas.length === 1 ? "área" : "áreas"}
            </span>
          </div>
          <div className="area-grid">
            {areas.map((area, index) => (
              <article
                key={area.id}
                className="area-card"
                style={{ "--area-color": area.color } as CSSProperties}
              >
                <div className="area-card-top">
                  <span className="area-icon">
                    <AreaIcon name={area.icon} size={25} />
                  </span>
                  <span className="area-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h2>{area.name}</h2>
                <p className="area-description">
                  Um espaço para o que importa.
                </p>
                <Link href={"/areas/" + area.id} className="text-link">
                  Abrir planejamento →
                </Link>
                <div className="area-card-footer">
                  <span className="area-type">
                    <span />
                    Área pessoal
                  </span>
                  <div className="row-actions">
                    <button
                      className="small-icon-button"
                      disabled={pending || index === 0}
                      aria-label={"Mover " + area.name + " para cima"}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      className="small-icon-button"
                      disabled={pending || index === areas.length - 1}
                      aria-label={"Mover " + area.name + " para baixo"}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown size={16} />
                    </button>
                    <button
                      className="small-icon-button"
                      aria-label={"Editar " + area.name}
                      onClick={() => setEditor(area)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="small-icon-button delete-button"
                      aria-label={"Excluir " + area.name}
                      onClick={() => setRemoving(area)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <p className="section-footnote">
            Use as setas para organizar a ordem das áreas. Nome, ícone e cor
            podem ser alterados quando quiser.
          </p>
        </>
      ) : (
        <EmptyState
          title="Seu mapa começa aqui"
          action={
            <button className="button primary" onClick={() => setEditor("new")}>
              <Plus size={17} />
              Criar minha primeira área
            </button>
          }
        >
          Crie uma área para uma parte da vida à qual você quer dedicar atenção.
        </EmptyState>
      )}
      {editor && (
        <Modal
          title={editor === "new" ? "Nova área" : "Editar área"}
          onClose={() => setEditor(null)}
        >
          <AreaForm
            area={editor === "new" ? undefined : editor}
            onSaved={onSaved}
          />
        </Modal>
      )}
      {removing && (
        <Modal title="Excluir área?" onClose={() => setRemoving(null)}>
          <DeleteAreaForm area={removing} onSaved={onSaved} />
        </Modal>
      )}
    </>
  );
}
