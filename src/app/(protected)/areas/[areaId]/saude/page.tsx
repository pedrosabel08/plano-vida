import { notFound } from "next/navigation";
import { getDashboardContext } from "@/server/repositories/specialized";
import { getHealth } from "@/server/repositories/health";
import { HealthDashboard } from "@/features/health/health-dashboard";
export const metadata = { title: "Sono e Saúde Bucal" };
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
  const data = await getHealth(areaId);
  return <HealthDashboard context={context} data={data} />;
}
