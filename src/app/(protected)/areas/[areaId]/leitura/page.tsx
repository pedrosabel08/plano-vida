import { notFound } from "next/navigation";
import { getReading } from "@/server/repositories/reading";
import { getPlanning } from "@/server/repositories/planning";
import { ReadingWorkspace } from "@/features/reading/reading-workspace";
export const metadata = { title: "Leitura e estudos" };
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
  return (
    <ReadingWorkspace
      {...reading}
      planning={plan.data}
      areas={plan.areas}
      objectives={plan.objectives}
      start={plan.start}
    />
  );
}
