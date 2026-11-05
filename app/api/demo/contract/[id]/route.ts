import { NextResponse } from "next/server";
import { DEV_BYPASS, getGym, getMember } from "@/lib/queries";
import { getContract } from "@/lib/dev-store";
import { renderMemberContractPdf } from "@/lib/contract-pdf";

// Demo mode's stand-in for a signed Storage URL: demo contracts have no stored
// file, so the PDF is generated from the live template on request. Doesn't
// exist outside demo mode.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!DEV_BYPASS) return new NextResponse(null, { status: 404 });

  const { id } = await params;
  const contract = getContract(id);
  const gym = await getGym();
  const member = contract ? await getMember(contract.member_id, gym.id) : null;
  if (!member) return new NextResponse(null, { status: 404 });

  const pdf = await renderMemberContractPdf(gym, member);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="membership-agreement.pdf"',
    },
  });
}
