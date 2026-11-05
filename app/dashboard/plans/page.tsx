import type { Metadata } from "next";
import { getGym, getPlansWithMemberCount } from "@/lib/queries";
import { PlansManager } from "@/components/dashboard/PlansManager";

export const metadata: Metadata = { title: "Plans" };

export default async function PlansPage() {
  const gym = await getGym();
  const plans = await getPlansWithMemberCount(gym.id);

  return <PlansManager plans={plans} gymId={gym.id} />;
}
