"use client";
import Link from "next/link";
import {
  useState,
  useTransition,
  type CSSProperties,
  type ReactNode,
} from "react";
import { usePathname } from "next/navigation";
import { setAreaDashboard } from "./actions";
import { ArrowLeft, Target } from "lucide-react";
import { WeekSelector } from "@/components/navigation/week-selector";
import { mondayForDate } from "@/lib/dates/weeks";
import { AreaActionsCard } from "@/features/actions/area-actions-card";
import type { Area, Profile } from "@/types/database";
import type { Objective } from "@/features/planning/types";
import type { AreaActionsData } from "@/features/actions/types";
export type DashboardContext = {
  area: Area;
  profile: Profile;
  objectives: Objective[];
  actions: AreaActionsData;
  today: string;
  start: string;
};
function DefaultDashboard({ areaId }: { areaId: string }) {
  const pathname = usePathname(),
    [pending, transition] = useTransition(),
    [notice, setNotice] = useState("");
  const [choice, setChoice] = useState(pathname.split("/").pop() || "leitura");
  return (
    <div>
      <label className="field">
        Dashboard inicial desta área
        <select
          value={choice}
          onChange={(event) => setChoice(event.target.value)}
        >
          {[
            ["leitura", "Leitura"],
            ["estudos", "Estudos"],
            ["financas", "Finanças"],
            ["carreira", "Carreira"],
            ["saude", "Sono e Saúde Bucal"],
          ].map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button
        className="text-link"
        disabled={pending}
        onClick={() =>
          transition(async () => {
            try {
              const result = await setAreaDashboard(areaId, choice);
              setNotice(result.message || "");
            } catch {
              setNotice(
                "Não foi possível salvar a preferência. Tente novamente.",
              );
            }
          })
        }
      >
        Salvar dashboard inicial da área
      </button>
      <p role="status" className="specialized-subtitle">
        {notice}
      </p>
    </div>
  );
}
export function DashboardFrame({
  context,
  title,
  description,
  quote,
  color,
  children,
  toolbar,
  compact = false,
  heroContent,
  headingIcon,
}: {
  context: DashboardContext;
  title: string;
  description: string;
  quote: string;
  color: string;
  children: ReactNode;
  toolbar?: ReactNode;
  compact?: boolean;
  heroContent?: ReactNode;
  headingIcon?: ReactNode;
}) {
  return (
    <div
      className="specialized-dashboard"
      style={{ "--accent": color } as CSSProperties}
    >
      <div className="specialized-top">
        <Link className="text-link" href="/areas">
          <ArrowLeft size={15} /> Áreas
        </Link>
        <Link
          className="text-link"
          href={`/areas/${context.area.id}?view=planning&week=${context.start}`}
        >
          Planejamento da área
        </Link>
      </div>
      <nav className="specialized-nav" aria-label="Dashboards da área">
        {[
          ["leitura", "Leitura"],
          ["estudos", "Estudos"],
          ["financas", "Finanças"],
          ["carreira", "Carreira"],
          ["saude", "Saúde"],
        ].map(([path, label]) => (
          <Link
            key={path}
            href={`/areas/${context.area.id}/${path}?week=${context.start}`}
          >
            {label}
          </Link>
        ))}
      </nav>
      <header className={`panel specialized-hero ${compact ? "compact" : ""}`}>
        <div>
          <span className="eyebrow">{context.area.name}</span>
          <h1>
            {headingIcon}
            {title}
          </h1>
          <p>{description}</p>
          {heroContent}
          {toolbar && <div className="specialized-toolbar">{toolbar}</div>}
        </div>
        {!compact && <blockquote>“{quote}”</blockquote>}
      </header>
      {children}
      <DefaultDashboard areaId={context.area.id} />
    </div>
  );
}
export function Card({
  title,
  children,
  action,
  className = "",
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel specialized-card ${className}`}>
      <div className="specialized-card-heading">
        <h2>{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}
export function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
}) {
  return (
    <div className="panel specialized-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      {detail && <small>{detail}</small>}
    </div>
  );
}
export function Bar({ value, label }: { value: number; label: string }) {
  return (
    <div
      className="specialized-progress"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.round(value)}
      aria-valuemin={0}
      aria-valuemax={Math.max(100, Math.ceil(value))}
    >
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
export const n = (value: number) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(value);
export function Bars({
  data,
  unit = "h",
  divisor = 1,
  target,
}: {
  data: { date: string; value: number; missing?: boolean }[];
  unit?: string;
  divisor?: number;
  target?: number;
}) {
  const max = Math.max(target || 0, 1, ...data.map((d) => d.value));
  return (
    <div className="specialized-chart" aria-label="Evolução por data">
      {target !== undefined && (
        <span
          className="specialized-target"
          style={{ bottom: `${24 + (target / max) * 116}px` }}
        >
          Meta {n(target / divisor)}
          {unit}
        </span>
      )}
      {data.map((d) => (
        <div key={d.date} className="specialized-column">
          <button
            type="button"
            aria-label={`${d.date}: ${d.missing ? "Sem registro" : `${n(d.value / divisor)} ${unit}`}`}
            title={`${d.date}: ${d.missing ? "Sem registro" : `${n(d.value / divisor)} ${unit}`}`}
          >
            <span style={{ height: `${(d.value / max) * 100}%` }} />
            <b>{d.missing ? "—" : n(d.value / divisor)}</b>
          </button>
          <small>
            {d.date.slice(8)}/{d.date.slice(5, 7)}
          </small>
        </div>
      ))}
    </div>
  );
}
export function WeekControl({ context }: { context: DashboardContext }) {
  return (
    <div className="specialized-week">
      <WeekSelector
        start={context.start}
        current={mondayForDate(context.today)}
        timezone={context.profile.timezone}
      />
    </div>
  );
}
export function Actions({ context }: { context: DashboardContext }) {
  return (
    <AreaActionsCard
      areaId={context.area.id}
      areaName={context.area.name}
      data={context.actions}
      books={[]}
      objectives={context.objectives}
      today={context.today}
      timezone={context.profile.timezone}
      contextLabel={context.area.name}
      showBooks={false}
    />
  );
}
export function Empty({ children }: { children: ReactNode }) {
  return <p className="specialized-empty">{children}</p>;
}
export function Objectives({ context }: { context: DashboardContext }) {
  const list = context.objectives.filter(
    (o) => o.area_id === context.area.id && o.state === "ACTIVE",
  );
  return (
    <Card
      title="Objetivos ativos"
      action={
        <Link className="text-link" href="/objetivos">
          Ver todos →
        </Link>
      }
    >
      {list.length ? (
        list.map((o) => (
          <div className="specialized-row" key={o.id}>
            <Target size={23} />
            <div>
              <strong>{o.title}</strong>
              <p>
                {o.type === "QUALITATIVE"
                  ? "Acompanhamento qualitativo"
                  : `${o.current_value || 0} / ${o.target || "—"} ${o.unit || ""}`}
              </p>
            </div>
          </div>
        ))
      ) : (
        <Empty>Vincule um objetivo compartilhado a esta área.</Empty>
      )}
    </Card>
  );
}
