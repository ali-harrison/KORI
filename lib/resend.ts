import { Resend } from "resend";

// Lazily instantiated — avoids throwing during build when RESEND_API_KEY is empty
function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

export function isEmailConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}

// Must be an address on a domain verified in the Resend account, or every
// send gets rejected.
const FROM = process.env.EMAIL_FROM || "kori/os <noreply@kori.gym>";

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Light-background branded shell — inline styles only, since email clients
// strip <style> tags. bodyText is plain text (already token-rendered by
// lib/templates.ts); blank-line-separated paragraphs become <p>s, single
// newlines become <br>. Escaped as a whole after merging so nothing in the
// gym's own template text or a member's name can break the markup.
function renderEmailShell({
  gymName,
  logoUrl,
  bodyText,
}: {
  gymName: string;
  logoUrl: string | null;
  bodyText: string;
}): string {
  const paragraphs = bodyText
    .split(/\n{2,}/)
    .map(
      (para) =>
        `<p style="margin:0 0 14px;color:#222;font-size:14px;line-height:1.6;">${escapeHtml(para).replace(/\n/g, "<br>")}</p>`
    )
    .join("");

  const header = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" alt="${escapeHtml(gymName)}" style="max-height:48px;max-width:200px;display:block;margin:0 0 20px;">`
    : `<div style="font-size:16px;font-weight:600;color:#111;margin:0 0 20px;">${escapeHtml(gymName)}</div>`;

  return `
    <div style="max-width:520px;margin:0 auto;padding:32px 24px;font-family:-apple-system,Helvetica,Arial,sans-serif;background:#fff;">
      ${header}
      ${paragraphs}
      <p style="margin:24px 0 0;font-size:12px;color:#999;">Sent by ${escapeHtml(gymName)} via kori/os.</p>
    </div>
  `;
}

// ── Membership contract — the owner-edited template now renders into the
// attached PDF (lib/contract-pdf.tsx), not the email body. This body is
// fixed, short notice text, not template-driven. ─────────────────────────
export async function sendContractEmail({
  to,
  replyTo,
  gymName,
  logoUrl,
  memberName,
  pdfBuffer,
}: {
  to: string;
  replyTo: string | null;
  gymName: string;
  logoUrl: string | null;
  memberName: string;
  pdfBuffer: Buffer;
}) {
  return getResend().emails.send({
    from: FROM,
    to,
    replyTo: replyTo ?? undefined,
    subject: `Your membership agreement — ${gymName}`,
    html: renderEmailShell({
      gymName,
      logoUrl,
      bodyText: `Hi ${memberName},\n\nYour membership agreement with ${gymName} is attached as a PDF. Please review, sign, and return it, or reply to this email if you have any questions.`,
    }),
    attachments: [
      {
        filename: "membership-agreement.pdf",
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  });
}

// ── Overdue payment reminder — subject + body both owner-edited ─────────────
export async function sendOverdueReminderEmail({
  to,
  replyTo,
  gymName,
  logoUrl,
  subject,
  bodyText,
}: {
  to: string;
  replyTo: string | null;
  gymName: string;
  logoUrl: string | null;
  subject: string;
  bodyText: string;
}) {
  return getResend().emails.send({
    from: FROM,
    to,
    replyTo: replyTo ?? undefined,
    subject,
    html: renderEmailShell({ gymName, logoUrl, bodyText }),
  });
}
