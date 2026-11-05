import type { Metadata } from "next";
import { getGym, DEMO_MODE } from "@/lib/queries";
import { SettingsForm } from "@/components/dashboard/SettingsForm";
import { Bilingual, PageHeader } from "@/components/ui";
import { toClientGym } from "@/utils";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const gym = await getGym();

  return (
    <div>
      <PageHeader eyebrow={<Bilingual reo="Tautuhinga" en="Settings" />} title="Your gym, your wording" />
      <SettingsForm gym={toClientGym(gym)} isDemo={DEMO_MODE} />
    </div>
  );
}
