"use server";

import { revalidatePath } from "next/cache";
import { getGym, getMember, getMemberContracts, requireSession, DEMO_MODE } from "@/lib/queries";
import { demoWrite } from "@/lib/demo-session";
import { isEmailConfigured, sendContractEmail } from "@/lib/resend";
import { renderMemberContractPdf } from "@/lib/contract-pdf";

const CONTRACTS_BUCKET = "contracts";

// Renders the gym's own contract_template into a PDF (lib/contract-pdf.tsx)
// and emails it as an attachment — creates a pending contracts row if none
// exists yet, otherwise re-sends and bumps last_sent_at on the existing
// pending one. Does NOT touch status/signed_at — this is "sent," not
// "signed"; see markContractSigned.
export async function sendContract(
  memberId: string,
  gymId: string
): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireSession();

  const [gym, member, contracts] = await Promise.all([
    getGym(),
    getMember(memberId, gymId),
    getMemberContracts(memberId),
  ]);
  if (!member) return { error: "Member not found" };

  if (!DEMO_MODE && !isEmailConfigured()) {
    return { error: "Email sending isn't set up yet, so this contract wasn't sent." };
  }

  const memberName = `${member.first_name} ${member.last_name}`;

  // Separate from the email try/catch below — @react-pdf/image does a
  // real fetch() for a remote logo URL, so this is real network I/O, not
  // the pure/local step it looks like. A dead logo link should read as a
  // PDF-generation failure, not an email-send failure.
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderMemberContractPdf(gym, member);
  } catch (err) {
    console.error("Failed to generate contract PDF", err);
    return { error: "Failed to generate the contract PDF. Try again." };
  }

  const pending = contracts.find((c) => c.status === "pending");

  // No email leaves demo mode. PDF generation above still ran for real, so a
  // broken template fails here exactly as it would in production.
  if (DEMO_MODE) {
    const result = await demoWrite("sendContract", memberId);
    if (result) return result;
    revalidatePath("/dashboard", "layout");
    return { success: true };
  }

  try {
    await sendContractEmail({
      to: member.email,
      replyTo: gym.email,
      gymName: gym.name,
      logoUrl: gym.logo_url,
      memberName,
      pdfBuffer,
    });
  } catch (err) {
    console.error("Failed to send contract email", err);
    return { error: "Failed to send the contract email. Try again." };
  }

  // From here the primary action (the email) succeeded — this function
  // only ever writes state that's actually true.
  const contractId = pending?.id ?? crypto.randomUUID();
  const storagePath = `${gymId}/${contractId}.pdf`;

  // Best-effort and secondary to the email: if this fails, the member
  // still has their PDF (it was attached to the email that already sent),
  // they just can't be re-downloaded from the admin UI. Logged loudly, but
  // not worth failing the whole action over.
  let uploadSucceeded = false;
  const { error: uploadError } = await supabase.storage
    .from(CONTRACTS_BUCKET)
    .upload(storagePath, pdfBuffer, { upsert: true, contentType: "application/pdf" });
  if (uploadError) {
    console.error(`Failed to upload contract PDF for contract ${contractId} — email was still sent`, uploadError);
  } else {
    uploadSucceeded = true;
  }

  const now = new Date().toISOString();
  // Never write pdf_url: null on a failed upload — that would blank out a
  // previously-good value from an earlier successful send.
  const updatePayload: { last_sent_at: string; pdf_url?: string } = { last_sent_at: now };
  if (uploadSucceeded) updatePayload.pdf_url = storagePath;

  const { error } = pending
    ? await supabase.from("contracts").update(updatePayload).eq("id", pending.id).eq("gym_id", gymId)
    : await supabase
        .from("contracts")
        .insert({ id: contractId, gym_id: gymId, member_id: memberId, status: "pending", ...updatePayload });

  if (error) return { error: error.message };

  revalidatePath("/dashboard", "layout");
  return { success: true };
}

// Generates a short-lived signed URL for downloading a contract's stored
// PDF — pdf_url only ever stores the storage path (private bucket), never
// a directly-fetchable URL. RLS-scoped client means a forged gymId simply
// finds nothing; no separate ownership check needed.
export async function getContractDownloadUrl(
  contractId: string,
  gymId: string
): Promise<{ url: string } | { error: string }> {
  const { supabase } = await requireSession();

  if (DEMO_MODE) {
    return { url: `/api/demo/contract/${contractId}` };
  }

  const { data: contract, error } = await supabase
    .from("contracts")
    .select("pdf_url")
    .eq("id", contractId)
    .eq("gym_id", gymId)
    .maybeSingle();

  if (error || !contract?.pdf_url) {
    return { error: "No PDF available for this contract." };
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(CONTRACTS_BUCKET)
    .createSignedUrl(contract.pdf_url, 60);

  if (signError || !signed) {
    return { error: "Failed to generate a download link. Try again." };
  }

  return { url: signed.signedUrl };
}

// Manual sign-tracking — no e-signature vendor. The owner gets a signature
// however they normally do (in person, paper, email reply) and ticks this
// off themselves.
export async function markContractSigned(
  contractId: string,
  gymId: string,
  memberId: string
): Promise<{ error: string } | { success: true }> {
  const { supabase } = await requireSession();

  if (DEMO_MODE) {
    const result = await demoWrite("markContractSigned", contractId);
    if (result) return result;
  } else {
    const { error } = await supabase
      .from("contracts")
      .update({ status: "signed", signed_at: new Date().toISOString() })
      .eq("id", contractId)
      .eq("gym_id", gymId);

    if (error) return { error: error.message };
  }

  revalidatePath("/dashboard", "layout");
  return { success: true };
}
