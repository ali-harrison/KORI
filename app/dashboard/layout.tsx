import { getGym, getUser } from "@/lib/queries";
import { Sidebar } from "@/components/dashboard/Sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, gym] = await Promise.all([getUser(), getGym()]);

  return (
    <div className="flex h-full bg-[#0c0c0c]">
      <Sidebar gymName={gym.name} />
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
