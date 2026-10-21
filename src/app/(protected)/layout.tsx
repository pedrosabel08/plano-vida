import { requireOnboardedAccount } from "@/server/repositories/account";
import { AppShell } from "@/components/layout/app-shell";
export const dynamic = "force-dynamic";
export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireOnboardedAccount();
  return <AppShell profile={profile}>{children}</AppShell>;
}
