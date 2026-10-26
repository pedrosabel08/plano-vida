import { addDays } from "@/lib/dates/weeks";
import type { CareerData } from "@/features/career/types";
export function careerDashboard(
  data: CareerData,
  start: string,
  today: string,
) {
  const milestones = data.milestones.filter((m) => !m.is_deleted),
    completed = (date: string | null) => !!date && date <= today;
  const projects = data.projects.map((p) => {
    const items = milestones.filter((m) => m.project_id === p.id),
      done = items.filter((m) => completed(m.completed_on)).length;
    const overdue = items.some(
      (m) => !completed(m.completed_on) && !!m.due_on && m.due_on < today,
    );
    return {
      ...p,
      items,
      done,
      total: items.length,
      percent: items.length ? (done / items.length) * 100 : null,
      onTrack: !!p.due_on && p.due_on >= today && !overdue,
    };
  });
  const active = projects.filter((p) => p.status === "ACTIVE"),
    measurable = active.filter((p) => p.due_on);
  const commitments = data.commitments.filter((c) => !c.is_deleted);
  const meetings = commitments.filter(
    (c) =>
      c.kind === "MEETING" && c.due_on >= start && c.due_on < addDays(start, 7),
  );
  const deliveries = commitments.filter(
    (c) => c.kind === "DELIVERY" && c.due_on.startsWith(start.slice(0, 7)),
  );
  const studyArea = data.settings[0]?.study_area_id;
  const minutes = studyArea
    ? data.study_sessions
        .filter(
          (s) =>
            s.area_id === studyArea &&
            !s.is_deleted &&
            s.studied_on >= start &&
            s.studied_on < addDays(start, 7) &&
            s.studied_on <= today,
        )
        .reduce((n, s) => n + s.minutes, 0)
    : null;
  return {
    projects,
    active,
    measurable,
    onTrack: measurable.filter((p) => p.onTrack).length,
    meetings: {
      done: meetings.filter((c) => completed(c.completed_on)).length,
      total: meetings.length,
    },
    deliveries: {
      done: deliveries.filter((c) => completed(c.completed_on)).length,
      total: deliveries.length,
    },
    minutes,
    achievements: milestones
      .filter((m) => completed(m.completed_on))
      .sort((a, b) => b.completed_on!.localeCompare(a.completed_on!)),
  };
}
