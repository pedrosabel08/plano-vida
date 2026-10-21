import { notFound } from "next/navigation";
import { getPlanning } from "@/server/repositories/planning";
import { PlanningWorkspace } from "@/features/planning/planning-workspace";
export const metadata = { title: "Planejamento da área" };
export default async function AreaPage({
  params,
  searchParams,
}: {
  params: Promise<{ areaId: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { areaId } = await params;
  const { week } = await searchParams;
  const context = await getPlanning(week);
  if (!context.areas.some((a) => a.id === areaId)) notFound();
  return <PlanningWorkspace {...context} areaId={areaId} />;
}
