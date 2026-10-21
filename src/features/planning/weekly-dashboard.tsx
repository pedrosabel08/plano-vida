import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  LayoutGrid,
  CalendarDays,
} from "lucide-react";
import type { CSSProperties } from "react";
import { getPlanning } from "@/server/repositories/planning";
import { AreaIcon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import { ScoreBadge, ProgressBar } from "@/components/data/performance";
import { WeekSelector } from "@/components/navigation/week-selector";
import { resolveWeekStart } from "@/lib/dates/weeks";
import { formatPercent } from "@/lib/formatting/performance";
export async function WeeklyDashboard({ week }: { week?: string }) {
  const { start, areas, data, profile, performance } = await getPlanning(week);
  const calculated = performance.week;
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">SEU PLANO EM MOVIMENTO</span>
          <h1>Sua semana, com clareza.</h1>
          <p>Planeje o que importa e acompanhe cada resultado.</p>
        </div>
        <Link
          href={areas.length ? "/planejamento?week=" + start : "/areas"}
          className="button primary"
        >
          <CalendarDays size={17} />
          {areas.length ? "Planejar semana" : "Criar minha primeira área"}
        </Link>
      </div>
      <WeekSelector
        start={start}
        current={resolveWeekStart(undefined, profile.timezone)}
        timezone={data.week?.timezone || profile.timezone}
      />
      <section className="week-summary">
        <div className="summary-primary">
          <span className="eyebrow">DESEMPENHO DA SEMANA</span>
          <div data-testid="week-score">
            <ScoreBadge result={calculated} />
          </div>
          <p>Média simples das áreas com resultado calculável.</p>
        </div>
        <div className="summary-progress">
          <strong data-testid="week-percent">
            {calculated.exact
              ? formatPercent(calculated.exact.performance)
              : "—"}
          </strong>
          {calculated.exact && (
            <ProgressBar
              value={calculated.performance!}
              label="Desempenho geral da semana"
            />
          )}
          <span>
            {calculated.calculableCount} de {areas.length} áreas com resultado
          </span>
        </div>
      </section>
      <div className="section-heading home-section-heading">
        <div className="section-label">
          <LayoutGrid size={18} />
          <h2>As áreas da sua vida</h2>
          <span className="count-badge">{areas.length}</span>
        </div>
        <Link href="/areas" className="text-link">
          Gerenciar áreas
          <ArrowUpRight size={16} />
        </Link>
      </div>
      {areas.length ? (
        <div className="area-grid home-area-grid">
          {performance.areas.map(({ area, result, goals }) => (
            <Link
              key={area.id}
              href={"/areas/" + area.id + "?week=" + start}
              className="area-card home-area-card performance-area-card"
              style={{ "--area-color": area.color } as CSSProperties}
              aria-label={"Abrir " + area.name}
            >
              <div className="area-card-top">
                <span className="area-icon">
                  <AreaIcon name={area.icon} size={24} />
                </span>
                <ArrowUpRight size={18} className="card-link-arrow" />
              </div>
              <h2>{area.name}</h2>
              <div className="area-dashboard-score">
                <ScoreBadge result={result} />
              </div>
              {result.exact && (
                <>
                  <p className="area-dashboard-percent">
                    {formatPercent(result.exact.performance)} de desempenho
                  </p>
                  <ProgressBar
                    value={result.performance!}
                    label={"Desempenho de " + area.name}
                  />
                </>
              )}
              <div className="home-area-meta">
                <span className="area-type">
                  <span />
                  {goals.filter((g) => g.goal.state === "ACTIVE").length} metas
                  ativas
                </span>
                <span className="card-detail-link">
                  Ver composição
                  <ArrowRight size={13} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState title="Um começo só seu">
          Suas áreas aparecerão aqui depois que você criar a primeira.
        </EmptyState>
      )}
      <details className="breakdown week-breakdown">
        <summary>Como a nota da semana é calculada</summary>
        <div className="breakdown-content">
          <p>
            Primeiro calculamos a média das contribuições das metas de cada
            área. Depois calculamos a média das áreas com resultado. Todas as
            áreas têm o mesmo peso.
          </p>
          {performance.areas.map(({ area, result }) => (
            <div className="breakdown-row" key={area.id}>
              <span>{area.name}</span>
              <span>
                {result.exact
                  ? formatPercent(result.exact.performance)
                  : result.state === "NO_GOALS"
                    ? "Sem meta semanal"
                    : "Sem dados suficientes"}
              </span>
            </div>
          ))}
          <div className="breakdown-total">
            <span>{calculated.calculableCount} áreas no denominador</span>
            <span>
              {calculated.exact
                ? formatPercent(calculated.exact.performance)
                : "Sem resultado"}
            </span>
          </div>
          {calculated.incompleteCount > 0 && (
            <p className="calculation-note">
              Áreas sem resultado não entram na média. Há{" "}
              {calculated.incompleteCount} áreas sem resultado completo.
            </p>
          )}
        </div>
      </details>
    </>
  );
}
