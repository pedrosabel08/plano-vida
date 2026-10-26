import { notFound } from "next/navigation";
import { getDashboardContext } from "@/server/repositories/specialized";
import { getCareer } from "@/server/repositories/career";
import { getAreas } from "@/server/repositories/account";
import { CareerDashboard } from "@/features/career/career-dashboard";
export const metadata = { title: "Carreira" };
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
  const [data, areas] = await Promise.all([getCareer(areaId), getAreas()]);
  return <CareerDashboard context={context} data={data} areas={areas} />;
}
