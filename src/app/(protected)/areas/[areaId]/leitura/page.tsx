import { notFound } from "next/navigation";
import { getReading } from "@/server/repositories/reading";
import { getPlanning } from "@/server/repositories/planning";
import { ReadingWorkspace } from "@/features/reading/reading-workspace";
import { getAreaActions } from "@/server/repositories/actions";
import { todayInTimezone } from "@/lib/dates/weeks";
export const metadata = { title: "Leitura" };
export default async function ReadingPage({
  params,
  searchParams,
}: {
  params: Promise<{ areaId: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { areaId } = await params;
  const { week } = await searchParams;
  const reading = await getReading(areaId);
  if (!reading) notFound();
  const plan = await getPlanning(week);
  const actions = await getAreaActions(areaId);
  return (
    <ReadingWorkspace
      {...reading}
      planning={plan.data}
      areas={plan.areas}
      objectives={plan.objectives}
      start={plan.start}
      today={todayInTimezone(new Date(), reading.profile.timezone)}
      actions={actions}
    />
  );
}
