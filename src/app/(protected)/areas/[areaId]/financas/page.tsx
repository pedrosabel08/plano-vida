import { notFound } from "next/navigation";
import { getDashboardContext } from "@/server/repositories/specialized";
import { getFinances } from "@/server/repositories/finances";
import { FinancesDashboard } from "@/features/finances/finances-dashboard";
export const metadata = { title: "Finanças" };
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ areaId: string }>;
  searchParams: Promise<{ week?: string; month?: string }>;
}) {
  const { areaId } = await params;
  const query = await searchParams;
  const context = await getDashboardContext(areaId, query.week);
  if (!context) notFound();
  const data = await getFinances(areaId);
  const month =
    query.month &&
    /^\d{4}-(0[1-9]|1[0-2])$/.test(query.month) &&
    query.month >= "1900-01"
      ? query.month
      : context.today.slice(0, 7);
  return <FinancesDashboard context={context} data={data} month={month} />;
}
