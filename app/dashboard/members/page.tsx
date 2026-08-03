import { getGym, getMembers, getPlans } from "@/lib/queries";
import { Header } from "@/components/dashboard/Header";
import { MembersTableWrapper } from "@/components/dashboard/MembersTableWrapper";

export default async function MembersPage() {
  const gym = await getGym();
  const [members, plans] = await Promise.all([
    getMembers(gym.id),
    getPlans(gym.id),
  ]);

  return (
    <div>
      <Header
        title="Members"
        description={`${members.length} total`}
        userEmail={gym.email ?? undefined}
        userInitials={gym.name.slice(0, 2).toUpperCase()}
      />
      <div className="px-8 py-7">
        <MembersTableWrapper members={members} plans={plans} gymId={gym.id} />
      </div>
    </div>
  );
}
