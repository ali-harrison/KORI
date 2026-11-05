import { getGym, getUser, getMemberCount, DEMO_MODE } from "@/lib/queries";
import { AppShell } from "@/components/dashboard/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, gym] = await Promise.all([getUser(), getGym()]);
  const memberCount = await getMemberCount(gym.id);

  return (
    <AppShell gymName={gym.name} memberCount={memberCount} userEmail={user.email} isDemo={DEMO_MODE}>
      {children}
    </AppShell>
  );
}
