export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + "T12:00:00Z");
  return (
    !Number.isNaN(d.getTime()) &&
    d.toISOString().slice(0, 10) === value &&
    value >= "1900-01-01" &&
    value <= "9999-12-31"
  );
}
export function addDays(value: string, days: number) {
  const d = new Date(value + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
export function mondayForDate(value: string) {
  if (!validDate(value)) throw new Error("Data inválida.");
  const weekday = new Date(value + "T12:00:00Z").getUTCDay();
  return addDays(value, -((weekday + 6) % 7));
}
export function todayInTimezone(now: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return get("year") + "-" + get("month") + "-" + get("day");
}
export function resolveWeekStart(
  value: string | undefined,
  timezone: string,
  now = new Date(),
) {
  return mondayForDate(
    value && validDate(value) ? value : todayInTimezone(now, timezone),
  );
}
export function weekLabel(start: string) {
  const format = (date: string) =>
    new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(date + "T12:00:00Z"));
  return format(start) + " — " + format(addDays(start, 6));
}
