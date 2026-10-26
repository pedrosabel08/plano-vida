import { notFound } from "next/navigation";
import { getReading } from "@/server/repositories/reading";
import { getPlanning } from "@/server/repositories/planning";
import { ReadingWorkspace } from "@/features/reading/reading-workspace";
import { todayInTimezone } from "@/lib/dates/weeks";
export const metadata = { title: "Livro" };
export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ areaId: string; bookId: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { areaId, bookId } = await params;
  const { week } = await searchParams;
  const reading = await getReading(areaId);
  if (!reading || !reading.data.books.some((b) => b.id === bookId)) notFound();
  const plan = await getPlanning(week);
  return (
    <ReadingWorkspace
      {...reading}
      bookId={bookId}
      planning={plan.data}
      areas={plan.areas}
      objectives={plan.objectives}
      start={plan.start}
      today={todayInTimezone(new Date(), reading.profile.timezone)}
      actions={{ items: [] }}
    />
  );
}
