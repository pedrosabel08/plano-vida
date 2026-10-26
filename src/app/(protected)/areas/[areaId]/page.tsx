import { notFound, redirect } from "next/navigation";
import { getPlanning } from "@/server/repositories/planning";
import { PlanningWorkspace } from "@/features/planning/planning-workspace";
import { requireOnboardedAccount } from "@/server/repositories/account";
export const metadata = { title: "Planejamento da área" };
export default async function AreaPage({
  params,
  searchParams,
}: {
  params: Promise<{ areaId: string }>;
  searchParams: Promise<{ week?: string; view?: string }>;
}) {
  const { areaId } = await params;
  const { week, view } = await searchParams;
  const context = await getPlanning(week);
  if (!context.areas.some((a) => a.id === areaId)) notFound();
  if (view !== "planning") {
    const { supabase } = await requireOnboardedAccount();
    const preference = await supabase.rpc("get_area_dashboard", {
      p_area_id: areaId,
    });
    if (
      preference.data &&
      ["leitura", "estudos", "financas", "carreira", "saude"].includes(
        preference.data,
      )
    )
      redirect(`/areas/${areaId}/${preference.data}?week=${context.start}`);
  }
  if (
    view !== "planning" &&
    context.data.area_modules?.some(
      (m) => m.area_id === areaId && m.module === "READING" && m.enabled,
    )
  ) {
    redirect("/areas/" + areaId + "/leitura?week=" + context.start);
  }
  return <PlanningWorkspace {...context} areaId={areaId} />;
}
