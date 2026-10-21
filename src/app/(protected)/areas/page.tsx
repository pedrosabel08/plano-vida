import { getAreas } from "@/server/repositories/account";
import { AreaManager } from "@/features/areas/area-manager";
export const metadata = { title: "Minhas áreas" };
export default async function AreasPage() {
  return <AreaManager areas={await getAreas()} />;
}
