import { WeeklyDashboard } from "@/features/planning/weekly-dashboard";
export const metadata = { title: "Início" };
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const { week } = await searchParams;
  return <WeeklyDashboard week={week} />;
}
