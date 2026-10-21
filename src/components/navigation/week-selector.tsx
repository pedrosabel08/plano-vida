"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { addDays, mondayForDate, weekLabel } from "@/lib/dates/weeks";
export function WeekSelector({
  start,
  current,
  timezone,
}: {
  start: string;
  current: string;
  timezone: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const href = (date: string) => pathname + "?week=" + date;
  return (
    <div className="week-toolbar">
      <div className="week-period">
        <CalendarDays size={18} />
        <div>
          <strong>{weekLabel(start)}</strong>
          <span>
            {start === current
              ? "Semana atual"
              : start < current
                ? "Semana anterior"
                : "Próxima semana"}{" "}
            · {timezone}
          </span>
        </div>
      </div>
      <div className="week-controls">
        <Link
          className="icon-button"
          href={href(addDays(start, -7))}
          aria-label="Semana anterior"
        >
          <ChevronLeft size={18} />
        </Link>
        <label className="week-date">
          <span className="sr-only">Escolher semana</span>
          <input
            type="date"
            aria-label="Escolher semana"
            value={start}
            onChange={(e) => {
              if (e.target.value)
                router.push(href(mondayForDate(e.target.value)));
            }}
          />
        </label>
        <Link
          className="icon-button"
          href={href(addDays(start, 7))}
          aria-label="Semana seguinte"
        >
          <ChevronRight size={18} />
        </Link>
        {start !== current && (
          <Link href={href(current)} className="button secondary">
            Hoje
          </Link>
        )}
      </div>
    </div>
  );
}
