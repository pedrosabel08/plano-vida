import { validDate } from "@/lib/dates/weeks";
export function localDateTime(instant: string, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(instant));
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
export function localToInstant(
  local: string,
  timezone: string,
  explicitOffset = "",
) {
  if (
    !/^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d$/.test(local) ||
    !validDate(local.slice(0, 10))
  )
    throw new Error("Informe data e horário válidos.");
  const naive = Date.parse(local + "Z");
  let candidates: string[] = [];
  if (explicitOffset) {
    if (!/^[+-](?:0\d|1[0-4]):[0-5]\d$/.test(explicitOffset))
      throw new Error("Use um deslocamento UTC como -03:00.");
    const instant = new Date(local + explicitOffset);
    if (
      !Number.isNaN(instant.getTime()) &&
      localDateTime(instant.toISOString(), timezone) === local
    )
      candidates = [instant.toISOString()];
  } else {
    const offsets = new Set<number>();
    for (const delta of [-36, 0, 36]) {
      const probe = new Date(naive + delta * 3600000);
      const wall = localDateTime(probe.toISOString(), timezone);
      offsets.add((Date.parse(wall + "Z") - probe.getTime()) / 60000);
    }
    candidates = [...offsets]
      .map((offset) => new Date(naive - offset * 60000).toISOString())
      .filter((instant) => localDateTime(instant, timezone) === local);
  }
  if (candidates.length === 0)
    throw new Error(
      "Esse horário não existe no fuso escolhido, ou o deslocamento UTC é incompatível.",
    );
  if (candidates.length > 1)
    throw new Error(
      "Esse horário ocorre duas vezes por mudança de fuso. Informe o deslocamento UTC do horário registrado.",
    );
  return candidates[0];
}
export function clockMinutes(instant: string, timezone: string) {
  const local = localDateTime(instant, timezone);
  return Number(local.slice(11, 13)) * 60 + Number(local.slice(14, 16));
}
export function circularRange(values: number[]) {
  if (values.length < 2) return null;
  const sorted = [...values].sort((a, b) => a - b);
  let gap = 0;
  for (let i = 0; i < sorted.length; i++)
    gap = Math.max(
      gap,
      (i === sorted.length - 1 ? sorted[0] + 1440 : sorted[i + 1]) - sorted[i],
    );
  return 1440 - gap;
}
