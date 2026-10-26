import { notFound } from "next/navigation";
import { getDashboardContext } from "@/server/repositories/specialized";
import { getStudies } from "@/server/repositories/studies";
import { getPlanning } from "@/server/repositories/planning";
import { StudiesDashboard } from "@/features/studies/studies-dashboard";
export const metadata = { title: "Estudos" };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ areaId: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { areaId } = await params;
  const { week } = await searchParams;
  const context = await getDashboardContext(areaId, week);
  if (!context) notFound();
  const [data, planning] = await Promise.all([
    getStudies(areaId),
    getPlanning(context.start),
  ]);
  return (
    <StudiesDashboard
      context={context}
      data={data}
      planning={planning.data}
      areas={planning.areas}
    />
  );
}
