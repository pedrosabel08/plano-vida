import { getAreas } from "@/server/repositories/account";
import { getObjectives } from "@/server/repositories/planning";
import { ObjectiveManager } from "@/features/objectives/objective-manager";
export const metadata = { title: "Objetivos" };
export default async function ObjectivesPage() {
  const [areas, objectives] = await Promise.all([getAreas(), getObjectives()]);
  return <ObjectiveManager areas={areas} objectives={objectives} />;
}
