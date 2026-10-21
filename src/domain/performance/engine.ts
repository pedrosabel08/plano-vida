import {
  add,
  approximate,
  compare,
  decimal,
  divide,
  HUNDRED,
  mean,
  multiply,
  ONE,
  ZERO,
  type Fraction,
} from "./fraction";
import type {
  AggregateResult,
  NormalizedGoal,
  PerformanceResult,
  ResultState,
} from "./types";
export const ENGINE_VERSION = "v1" as const;
function empty(state: ResultState, reason?: string): PerformanceResult {
  return {
    engineVersion: ENGINE_VERSION,
    state,
    rawPercent: null,
    contributionPercent: null,
    score: null,
    actual: null,
    target: null,
    observed: 0,
    expected: 0,
    coveragePercent: null,
    exact: null,
    reason,
  };
}
export function calcularDesempenhoMeta(
  goal: NormalizedGoal,
): PerformanceResult {
  if (goal.state === "CANCELLED")
    return empty("EXCLUDED", "Meta retirada do cálculo.");
  try {
    if (
      !["QUANTITY", "FREQUENCY", "AVERAGE", "COMPLETION"].includes(goal.type) ||
      !["MANUAL", "MODULE", "ACTION"].includes(goal.sourceKind) ||
      !["WEEKLY", "DAILY"].includes(goal.basis)
    )
      return empty("INVALID", "Configuração de medição inválida.");
    const ids = new Set(goal.observations.map((o) => o.id));
    if (ids.size !== goal.observations.length)
      return empty("INVALID", "Registros duplicados na fonte.");
    let target = decimal(goal.target);
    if (compare(target, ZERO) <= 0)
      return empty("INVALID", "O alvo deve ser positivo.");
    if (
      goal.type === "FREQUENCY" &&
      (target.d !== "1" ||
        !["OCCURRENCES", "DISTINCT_DAYS"].includes(goal.frequencyMode))
    )
      return empty("INVALID", "Frequência exige ocorrências inteiras.");
    if (goal.basis === "DAILY") {
      if (!["QUANTITY", "FREQUENCY"].includes(goal.type))
        return empty("INVALID", "Base diária não se aplica a este tipo.");
      target = multiply(target, decimal(7));
    }
    let actual: Fraction = ZERO;
    let observed = goal.observations.length;
    let expected = 0;
    let coverage: Fraction | null = null;
    if (goal.type === "COMPLETION") {
      if (
        compare(target, ONE) !== 0 ||
        goal.observations.length > 1 ||
        goal.observations.some(
          (o) => typeof o.completed !== "boolean" || o.value !== null,
        )
      )
        return empty("INVALID", "Conclusão exige um estado binário.");
      actual = goal.observations[0]?.completed ? ONE : ZERO;
    } else {
      const values = goal.observations.map((o) => {
        if (o.value === null || o.completed !== null)
          throw new Error("Registro incompatível");
        const v = decimal(o.value);
        if (compare(v, ZERO) < 0) throw new Error("Registro negativo");
        if (
          goal.type === "FREQUENCY" &&
          (v.d !== "1" ||
            (goal.frequencyMode === "DISTINCT_DAYS" && compare(v, ONE) !== 0))
        )
          throw new Error("Ocorrência inválida");
        return v;
      });
      if (goal.type === "AVERAGE") {
        if (
          !Number.isInteger(goal.expectedObservations) ||
          goal.expectedObservations < 1
        )
          return empty("INVALID", "Cobertura esperada inválida.");
        observed = new Set(goal.observations.map((o) => o.date)).size;
        expected = goal.expectedObservations;
        if (observed !== values.length)
          return empty(
            "INVALID",
            "A média manual aceita uma observação por dia.",
          );
        if (!observed)
          return {
            ...empty("INSUFFICIENT_DATA", "Sem observações."),
            expected,
            observed: 0,
            coveragePercent: 0,
          };
        actual = mean(values);
        coverage = multiply(
          divide(decimal(observed), decimal(expected)),
          HUNDRED,
        );
      } else if (
        goal.type === "FREQUENCY" &&
        goal.frequencyMode === "DISTINCT_DAYS"
      ) {
        if (compare(target, decimal(7)) > 0)
          return empty("INVALID", "Uma semana tem sete dias.");
        actual = decimal(new Set(goal.observations.map((o) => o.date)).size);
      } else actual = values.reduce(add, ZERO);
    }
    const raw = multiply(divide(actual, target), HUNDRED);
    const contribution = compare(raw, HUNDRED) > 0 ? HUNDRED : raw;
    const score = divide(contribution, decimal(10));
    const result = {
      engineVersion: ENGINE_VERSION,
      state: "CALCULABLE" as const,
      rawPercent: approximate(raw),
      contributionPercent: approximate(contribution),
      score: approximate(score),
      actual: approximate(actual),
      target: approximate(target),
      observed,
      expected,
      coveragePercent: coverage ? approximate(coverage) : null,
      exact: { raw, contribution, score, actual, target, coverage },
    };
    if (
      ![result.rawPercent, result.score, result.actual, result.target].every(
        Number.isFinite,
      )
    )
      return empty("INVALID", "Resultado fora do intervalo numérico.");
    return result;
  } catch {
    return empty("INVALID", "Registros ou configuração inconsistentes.");
  }
}
function aggregate(
  items: { id: string; result: PerformanceResult | AggregateResult }[],
  level: "area" | "week",
): AggregateResult {
  if (new Set(items.map((x) => x.id)).size !== items.length)
    return {
      engineVersion: ENGINE_VERSION,
      state: "INVALID",
      performance: null,
      score: null,
      exact: null,
      calculableCount: 0,
      totalCount: items.length,
      incompleteCount: items.length,
      breakdown: items,
    };
  const relevant = items.filter((x) => x.result.state !== "EXCLUDED");
  const valid = relevant.filter(
    (x) => x.result.state === "CALCULABLE" && x.result.exact,
  );
  const values = valid.map((x) => {
    const exact = x.result.exact!;
    return "contribution" in exact ? exact.contribution : exact.performance;
  });
  const base = {
    engineVersion: ENGINE_VERSION,
    calculableCount: valid.length,
    totalCount: relevant.length,
    incompleteCount: relevant.length - valid.length,
    breakdown: items,
  };
  if (!values.length) {
    const state: ResultState =
      !relevant.length || relevant.every((x) => x.result.state === "NO_GOALS")
        ? "NO_GOALS"
        : relevant.some((x) => x.result.state === "INVALID")
          ? "INVALID"
          : "INSUFFICIENT_DATA";
    return { ...base, state, performance: null, score: null, exact: null };
  }
  const performance = mean(values);
  const score = divide(performance, decimal(10));
  return {
    ...base,
    state: "CALCULABLE",
    performance: approximate(performance),
    score: approximate(score),
    exact: { performance, score },
    incompleteCount:
      level === "week"
        ? relevant.filter(
            (x) =>
              x.result.state !== "CALCULABLE" ||
              ("incompleteCount" in x.result && x.result.incompleteCount > 0),
          ).length
        : base.incompleteCount,
  };
}
export function calcularDesempenhoArea(
  goals: { id: string; result: PerformanceResult }[],
): AggregateResult {
  return aggregate(goals, "area");
}
export function calcularDesempenhoSemana(
  areas: { id: string; result: AggregateResult }[],
): AggregateResult {
  return aggregate(areas, "week");
}
