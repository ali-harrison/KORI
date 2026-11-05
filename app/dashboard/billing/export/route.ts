import { getCollectedThisMonth, getGym } from "@/lib/queries";
import { collectedToCsv } from "@/lib/reporting";
import { toLocalISODate } from "@/utils";

// Sits under /dashboard so proxy.ts guards it like every other dashboard page.
export async function GET() {
  const gym = await getGym();
  const payments = await getCollectedThisMonth(gym.id);

  return new Response(collectedToCsv(payments), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="collected-${toLocalISODate()}.csv"`,
    },
  });
}
