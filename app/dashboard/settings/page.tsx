import { getGym } from "@/lib/queries";
import { SettingsForm } from "@/components/dashboard/SettingsForm";

export default async function SettingsPage() {
  const gym = await getGym();

  return (
    <div>
      <div className="mb-[22px]">
        <h1 className="text-xl font-medium">Settings</h1>
        <p className="text-[13px] text-[#8f978f] mt-[3px]">Gym profile and integrations</p>
      </div>
      <SettingsForm gym={gym} />
    </div>
  );
}
