import { getGym, getMembers, getPlans } from "@/lib/queries";
import { MembersTableWrapper } from "@/components/dashboard/MembersTableWrapper";

export default async function MembersPage() {
  const gym = await getGym();
  const [members, plans] = await Promise.all([
    getMembers(gym.id),
    getPlans(gym.id),
  ]);

  return <MembersTableWrapper members={members} plans={plans} gymId={gym.id} />;
}
