"use client";
import { BookOpen, ChartNoAxesColumn, Flame } from "lucide-react";
import { useState } from "react";
import { readingDashboard } from "@/domain/reading/dashboard";
import { ProgressBar } from "@/components/data/performance";
import { formatPercent, formatValue } from "@/lib/formatting/performance";
import type { PerformanceResult } from "@/domain/performance/types";
import type { ReadingLog } from "./types";

const dayNames = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const number = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
function dateLabel(date: string, long = false) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "numeric",
    month: long ? "long" : "short",
    timeZone: "UTC",
  }).format(new Date(date + "T12:00:00Z"));
}
export function ReadingOverview({
  logs,
  start,
  today,
  goal,
  scope,
}: {
  logs: ReadingLog[];
  start: string;
  today: string;
  goal?: PerformanceResult;
  scope?: string;
}) {
  const stats = readingDashboard(logs, start, today);
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(
    10,
    Math.ceil(Math.max(...stats.history.map((d) => d.pages)) / 10) * 10,
  );
  const actual = goal?.exact
    ? formatValue(goal.exact.actual)
    : String(stats.pages);
  const percent = goal?.exact ? formatPercent(goal.exact.raw) : null;
  return (
    <div className="reading-overview">
      <section
        className="panel reading-week"
        aria-labelledby="reading-week-title"
      >
        <div className="reading-card-heading">
          <span className="reading-icon">
            <BookOpen size={29} />
          </span>
          <div>
            <h2 id="reading-week-title">Leitura da semana</h2>
            <p>
              {goal?.exact
                ? `Minha meta é ler ${formatValue(goal.exact.target)} páginas esta semana.`
                : "Defina uma meta para acompanhar sua semana."}
            </p>
          </div>
        </div>
        <div className="reading-week-total">
          <div>
            <strong data-testid="reading-week-pages">{actual}</strong>
            <span>
              {goal?.exact
                ? ` de ${formatValue(goal.exact.target)} páginas`
                : " páginas lidas"}
            </span>
          </div>
          <b data-testid="reading-week-percent">{percent || "Sem meta"}</b>
        </div>
        <ProgressBar
          value={Math.min(100, Math.max(0, goal?.rawPercent || 0))}
          label="Cumprimento da meta semanal de leitura"
        />
        {scope && (
          <p className="reading-scope">
            Meta: {scope} · indicadores diários de todos os livros
          </p>
        )}
        <div className="reading-days">
          {stats.week.map((day, i) => (
            <div
              key={day.date}
              className={day.pages > 0 ? "read" : ""}
              aria-label={`${dayNames[i]}, ${dateLabel(day.date, true)}: ${day.pages} páginas`}
              aria-current={day.date === today ? "date" : undefined}
            >
              <i />
              <span>{dayNames[i]}</span>
              <strong>{day.pages}</strong>
            </div>
          ))}
        </div>
      </section>
      <section
        className="panel reading-chart"
        aria-labelledby="reading-chart-title"
      >
        <div className="reading-card-heading">
          <ChartNoAxesColumn size={23} />
          <h2 id="reading-chart-title">Últimos 14 dias</h2>
        </div>
        <div className="reading-chart-caption">
          <span>Páginas lidas por dia</span>
          <span data-testid="reading-average">
            Média: {number.format(stats.average)} pág/dia
          </span>
        </div>
        <div className="reading-plot">
          <div className="reading-axis">
            <span>{max}</span>
            <span>{max / 2}</span>
            <span>0</span>
          </div>
          <div className="reading-bars" onMouseLeave={() => setActive(null)}>
            {stats.history.map((day, i) => (
              <div className="reading-bar-column" key={day.date}>
                <button
                  type="button"
                  className="reading-bar-hit"
                  aria-label={`${dateLabel(day.date, true)}: ${day.pages} páginas`}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => setActive(active === i ? null : i)}
                >
                  <span
                    className="reading-bar"
                    style={{ height: `${(day.pages / max) * 100}%` }}
                  />
                  {active === i && (
                    <span className="reading-tooltip" role="tooltip">
                      {dateLabel(day.date)}
                      <strong>{day.pages} páginas</strong>
                    </span>
                  )}
                </button>
                <span className="reading-bar-date">
                  {(i % 2 === 0 && i !== 12) || i === 13
                    ? dateLabel(day.date).replace(" de ", " ").replace(".", "")
                    : ""}
                </span>
              </div>
            ))}
          </div>
        </div>
        {!stats.history.some((d) => d.pages) && (
          <p className="reading-chart-empty">
            Nenhuma página registrada nos últimos 14 dias.
          </p>
        )}
      </section>
      <section
        className="panel reading-streak"
        aria-labelledby="reading-streak-title"
      >
        <span className="reading-icon">
          <Flame size={29} fill="currentColor" />
        </span>
        <div>
          <h2 id="reading-streak-title">Sequência atual</h2>
          <strong data-testid="reading-streak">
            {stats.streak} {stats.streak === 1 ? "dia" : "dias"}
          </strong>
          <p>
            {stats.streak
              ? "Uma página de cada vez. Continue assim!"
              : "Registre uma leitura para começar sua sequência."}
          </p>
        </div>
      </section>
      <figure
        className="panel reading-quote"
        aria-label="Frase para inspirar a leitura"
      >
        <blockquote>
          “Leitura é liberdade
          <br /> em forma de páginas.”
        </blockquote>
        <span />
      </figure>
    </div>
  );
}
