import { getGym } from "@/lib/queries";
import { Header } from "@/components/dashboard/Header";
import { SettingsForm } from "@/components/dashboard/SettingsForm";

export default async function SettingsPage() {
  const gym = await getGym();

  return (
    <div>
      <Header
        title="Settings"
        description="Gym profile and integrations"
        userEmail={gym.email ?? undefined}
        userInitials={gym.name.slice(0, 2).toUpperCase()}
      />
      <div className="px-8 py-7">
        <SettingsForm gym={gym} />
      </div>
    </div>
  );
}
