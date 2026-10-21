import type { Fraction } from "@/domain/performance/fraction";
/** Presentation is the only layer that rounds. Half-up is performed on the exact ratio. */
export function formatFraction(
  value: Fraction,
  digits = 0,
  trim = false,
): string {
  const n = BigInt(value.n),
    d = BigInt(value.d);
  const scale = 10n ** BigInt(digits);
  const negative = n < 0n;
  const a = negative ? -n : n;
  let q = (a * scale) / d;
  if (((a * scale) % d) * 2n >= d) q += 1n;
  const integer = q / scale;
  let fraction = digits ? (q % scale).toString().padStart(digits, "0") : "";
  if (trim) fraction = fraction.replace(/0+$/, "");
  return (
    (negative ? "-" : "") +
    new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 }).format(
      integer,
    ) +
    (fraction ? "," + fraction : "")
  );
}
export const formatScore = (value: Fraction) => formatFraction(value, 1);
export const formatPercent = (value: Fraction) =>
  formatFraction(value, Number(value.n) / Number(value.d) > 100 ? 0 : 2, true) +
  "%";
export const formatValue = (value: Fraction) => formatFraction(value, 4, true);
