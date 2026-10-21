import type {
  AggregateResult,
  PerformanceResult,
} from "@/domain/performance/types";
import {
  formatScore,
  formatPercent,
  formatValue,
  formatFraction,
} from "@/lib/formatting/performance";
export function ScoreBadge({
  result,
}: {
  result: AggregateResult | PerformanceResult;
}) {
  return result.exact ? (
    <span className="score-badge">
      <strong>{formatScore(result.exact.score)}</strong>
      <span> / 10</span>
    </span>
  ) : (
    <span className="no-result">
      {result.state === "NO_GOALS"
        ? "Sem meta semanal"
        : result.state === "EXCLUDED"
          ? "Retirada do cálculo"
          : result.state === "INVALID"
            ? "Configuração inconsistente"
            : "Sem dados suficientes"}
    </span>
  );
}
export function ProgressBar({
  value,
  label,
}: {
  value: number;
  label: string;
}) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
    >
      <span style={{ width: value + "%" }} />
    </div>
  );
}
export function GoalNumbers({
  result,
  unit,
  observationUnit,
}: {
  result: PerformanceResult;
  unit: string;
  observationUnit: string;
}) {
  return (
    <div className="goal-numbers">
      {result.exact ? (
        <>
          <div className="actual-target">
            <strong>{formatValue(result.exact.actual)}</strong>
            <span>
              {" "}
              / {formatValue(result.exact.target)} {unit}
            </span>
          </div>
          <div className="goal-result-line">
            <span className="raw-percent" data-testid="goal-raw">
              {formatPercent(result.exact.raw)} realizado
            </span>
            <ScoreBadge result={result} />
          </div>
          <div className="contribution-label">
            <span>Contribuição para a área</span>
            <span>{formatPercent(result.exact.contribution)}</span>
          </div>
          <ProgressBar
            value={result.contributionPercent!}
            label="Contribuição para a área"
          />
        </>
      ) : (
        <p className="no-result">{result.reason || "Sem dados suficientes"}</p>
      )}
      {result.expected > 0 && (
        <p className="coverage">
          Cobertura: {result.observed}/{result.expected} {observationUnit} (
          {result.exact?.coverage
            ? formatFraction(result.exact.coverage, 0)
            : "0"}
          %)
        </p>
      )}
    </div>
  );
}
export function AreaBreakdown({
  name,
  result,
  labels = {},
}: {
  name: string;
  result: AggregateResult;
  labels?: Record<string, string>;
}) {
  return (
    <details className="breakdown">
      <summary>Ver composição de {name}</summary>
      <div className="breakdown-content">
        <p>
          Cada meta calculável tem o mesmo peso. A contribuição individual é
          limitada a 100%.
        </p>
        {result.breakdown.map(({ id, result: goal }, i) => (
          <div className="breakdown-row" key={id}>
            <span>{labels[id] || "Meta " + (i + 1)}</span>
            <span>
              {"rawPercent" in goal && goal.exact && "raw" in goal.exact
                ? formatPercent(goal.exact.raw) +
                  " realizado → " +
                  formatPercent(goal.exact.contribution) +
                  " de contribuição"
                : goal.state === "EXCLUDED"
                  ? "Fora do cálculo"
                  : goal.state === "INVALID"
                    ? "Inválida"
                    : "Sem dados"}
            </span>
          </div>
        ))}
        <div className="breakdown-total">
          <span>
            Média de {result.calculableCount}{" "}
            {result.calculableCount === 1 ? "meta" : "metas"} calculáveis
          </span>
          <span>
            {result.exact ? formatPercent(result.exact.performance) : "—"}
          </span>
        </div>
        {result.incompleteCount > 0 && (
          <p className="calculation-note">
            Há metas sem resultado calculável. Consulte o detalhe antes de
            interpretar a nota.
          </p>
        )}
      </div>
    </details>
  );
}
