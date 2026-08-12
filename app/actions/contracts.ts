"use server";

import { createServerSupabaseClient } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getGym, getMember, getMemberContracts, DEV_BYPASS } from "@/lib/queries";
import { sendContractEmail } from "@/lib/resend";
import { renderContractPdf } from "@/lib/contract-pdf";
import { renderTemplate } from "@/lib/templates";
import { formatDate, formatPlanPrice } from "@/utils";

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
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const [gym, member, contracts] = await Promise.all([
    getGym(),
    getMember(memberId, gymId),
    getMemberContracts(memberId),
  ]);
  if (!member) return { error: "Member not found" };

  const memberName = `${member.first_name} ${member.last_name}`;
  const bodyText = renderTemplate(gym.contract_template, {
    member_name: memberName,
    gym_name: gym.name,
    plan_name: member.plan?.name ?? "—",
    amount: member.plan ? formatPlanPrice(member.plan) : "—",
    start_date: formatDate(member.start_date ?? member.created_at),
  });

  // Separate from the email try/catch below — @react-pdf/image does a
  // real fetch() for a remote logo URL, so this is real network I/O, not
  // the pure/local step it looks like. A dead logo link should read as a
  // PDF-generation failure, not an email-send failure.
  let pdfBuffer: Buffer;
  try {
    pdfBuffer = await renderContractPdf({
      gymName: gym.name,
      gymAddress: gym.address,
      gymPhone: gym.phone,
      gymEmail: gym.email,
      logoUrl: gym.logo_url,
      bodyText,
      memberName,
      date: formatDate(new Date()),
    });
  } catch (err) {
    console.error("Failed to generate contract PDF", err);
    return { error: "Failed to generate the contract PDF. Try again." };
  }

  const pending = contracts.find((c) => c.status === "pending");

  // Only the network calls are skipped under DEV_BYPASS — the Supabase
  // write below still runs unconditionally, consistent with every other
  // action in this codebase (cancelMember, updateMemberStatus, createMember
  // never guard their writes either). Actually sending a real email/
  // uploading to real storage during dev testing is what DEV_BYPASS needs
  // to prevent; a write to the dev/staging DB isn't the same risk.
  if (DEV_BYPASS) {
    console.log(`[dev] Would send contract PDF email to ${member.email}`);
  } else {
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
  }

  // From here the primary action (the email) succeeded or was dev-skipped
  // — this function only ever writes state that's actually true.
  const contractId = pending?.id ?? crypto.randomUUID();
  const storagePath = `${gymId}/${contractId}.pdf`;

  // Best-effort and secondary to the email: if this fails, the member
  // still has their PDF (it was attached to the email that already sent),
  // they just can't be re-downloaded from the admin UI. Logged loudly, but
  // not worth failing the whole action over.
  let uploadSucceeded = false;
  if (!DEV_BYPASS) {
    const { error: uploadError } = await supabase.storage
      .from(CONTRACTS_BUCKET)
      .upload(storagePath, pdfBuffer, { upsert: true, contentType: "application/pdf" });
    if (uploadError) {
      console.error(`Failed to upload contract PDF for contract ${contractId} — email was still sent`, uploadError);
    } else {
      uploadSucceeded = true;
    }
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

  revalidatePath(`/dashboard/members/${memberId}`);
  revalidatePath("/dashboard/contracts");
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
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

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
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { error } = await supabase
    .from("contracts")
    .update({ status: "signed", signed_at: new Date().toISOString() })
    .eq("id", contractId)
    .eq("gym_id", gymId);

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/members/${memberId}`);
  revalidatePath("/dashboard/contracts");
  return { success: true };
}
