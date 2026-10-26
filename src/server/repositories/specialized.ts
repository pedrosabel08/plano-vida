import "server-only";
import { getAreas, requireOnboardedAccount } from "./account";
import { getObjectives } from "./planning";
import { getAreaActions } from "./actions";
import { resolveWeekStart, todayInTimezone } from "@/lib/dates/weeks";
export async function getDashboardContext(areaId: string, week?: string) {
  const { profile } = await requireOnboardedAccount();
  const [areas, objectives, actions] = await Promise.all([
    getAreas(),
    getObjectives(),
    getAreaActions(areaId),
  ]);
  const area = areas.find((a) => a.id === areaId);
  if (!area) return null;
  return {
    area,
    profile,
    objectives,
    actions,
    today: todayInTimezone(new Date(), profile.timezone),
    start: resolveWeekStart(week, profile.timezone),
  };
}
