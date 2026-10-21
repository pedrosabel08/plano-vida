import { getPlanning } from "@/server/repositories/planning";
import { PlanningWorkspace } from "@/features/planning/planning-workspace";
export const metadata = { title: "Planejamento semanal" };
export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  const context = await getPlanning(week);
  return <PlanningWorkspace {...context} />;
}
