import { getGym, getPlansWithMemberCount } from "@/lib/queries";
import { Header } from "@/components/dashboard/Header";
import { PlansManager } from "@/components/dashboard/PlansManager";

export default async function PlansPage() {
  const gym = await getGym();
  const plans = await getPlansWithMemberCount(gym.id);

  return (
    <div>
      <Header
        title="Plans"
        description="Manage your membership plans"
        userEmail={gym.email ?? undefined}
        userInitials={gym.name.slice(0, 2).toUpperCase()}
      />
      <div className="px-8 py-7">
        <PlansManager plans={plans} gymId={gym.id} />
      </div>
    </div>
  );
}
