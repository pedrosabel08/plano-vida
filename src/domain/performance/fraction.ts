/** Exact rational arithmetic. No intermediate rounding or locale dependency. */
export type Fraction = { n: string; d: string };
type R = { n: bigint; d: bigint };
const gcd = (a: bigint, b: bigint): bigint => {
  a = a < 0n ? -a : a;
  while (b) {
    [a, b] = [b, a % b];
  }
  return a || 1n;
};
function reduce(n: bigint, d: bigint): R {
  if (d === 0n) throw new Error("Zero denominator");
  if (d < 0n) {
    n = -n;
    d = -d;
  }
  const g = gcd(n, d);
  return { n: n / g, d: d / g };
}
export function decimal(value: string | number): Fraction {
  const text = String(value);
  if (text.length > 100) throw new Error("Invalid decimal");
  const match = /^([+-]?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(text);
  if (!match) throw new Error("Invalid decimal");
  const exponent = Number(match[4] || 0);
  if (Math.abs(exponent) > 100) throw new Error("Invalid exponent");
  const scale = (match[3] || "").length - exponent;
  let n = BigInt(match[2] + (match[3] || "")) * (match[1] === "-" ? -1n : 1n);
  let d = 1n;
  if (scale >= 0) d = 10n ** BigInt(scale);
  else n *= 10n ** BigInt(-scale);
  return pack(reduce(n, d));
}
const unpack = (v: Fraction): R => reduce(BigInt(v.n), BigInt(v.d));
const pack = (v: R): Fraction => ({ n: String(v.n), d: String(v.d) });
export const ZERO: Fraction = { n: "0", d: "1" };
export const ONE: Fraction = { n: "1", d: "1" };
export const HUNDRED: Fraction = { n: "100", d: "1" };
export function add(a: Fraction, b: Fraction) {
  const x = unpack(a),
    y = unpack(b);
  return pack(reduce(x.n * y.d + y.n * x.d, x.d * y.d));
}
export function multiply(a: Fraction, b: Fraction) {
  const x = unpack(a),
    y = unpack(b);
  return pack(reduce(x.n * y.n, x.d * y.d));
}
export function divide(a: Fraction, b: Fraction) {
  const x = unpack(a),
    y = unpack(b);
  return pack(reduce(x.n * y.d, x.d * y.n));
}
export function compare(a: Fraction, b: Fraction) {
  const x = unpack(a),
    y = unpack(b);
  const delta = x.n * y.d - y.n * x.d;
  return delta < 0n ? -1 : delta > 0n ? 1 : 0;
}
export function approximate(a: Fraction) {
  const n = a.n.replace("-", ""),
    d = a.d;
  const leadingN = n.slice(0, 16),
    leadingD = d.slice(0, 16);
  return (
    (((a.n.startsWith("-") ? -1 : 1) * Number(leadingN)) / Number(leadingD)) *
    10 ** (n.length - leadingN.length - (d.length - leadingD.length))
  );
}
export function mean(values: Fraction[]) {
  return divide(values.reduce(add, ZERO), decimal(values.length));
}
