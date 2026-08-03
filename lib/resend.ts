import { Resend } from "resend";

// Lazily instantiated — avoids throwing during build when RESEND_API_KEY is empty
function getResend() {
  return new Resend(process.env.RESEND_API_KEY!);
}

const FROM = "KORI/GYM <noreply@kori.gym>";

// ── Welcome email sent to a new member after signup ──────────────────────────
export async function sendWelcomeEmail({
  to,
  memberName,
  gymName,
  portalUrl,
}: {
  to: string;
  memberName: string;
  gymName: string;
  portalUrl: string;
}) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Welcome to ${gymName}`,
    html: `
      <p>Hi ${memberName},</p>
      <p>You're now a member of <strong>${gymName}</strong>. Welcome!</p>
      <p>
        <a href="${portalUrl}" style="background:#e8ff47;color:#0c0c0c;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
          View Your Account
        </a>
      </p>
    `,
  });
}

// ── Contract ready to sign ───────────────────────────────────────────────────
export async function sendContractEmail({
  to,
  memberName,
  gymName,
  signUrl,
}: {
  to: string;
  memberName: string;
  gymName: string;
  signUrl: string;
}) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Your membership agreement — ${gymName}`,
    html: `
      <p>Hi ${memberName},</p>
      <p>Your membership agreement with <strong>${gymName}</strong> is ready to sign.</p>
      <p>
        <a href="${signUrl}" style="background:#e8ff47;color:#0c0c0c;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
          Review &amp; Sign
        </a>
      </p>
    `,
  });
}

// ── Payment failed notification ──────────────────────────────────────────────
export async function sendPaymentFailedEmail({
  to,
  memberName,
  gymName,
  updateCardUrl,
}: {
  to: string;
  memberName: string;
  gymName: string;
  updateCardUrl: string;
}) {
  return getResend().emails.send({
    from: FROM,
    to,
    subject: `Payment failed — action required`,
    html: `
      <p>Hi ${memberName},</p>
      <p>Your payment to <strong>${gymName}</strong> failed. Please update your payment details to keep your membership active.</p>
      <p>
        <a href="${updateCardUrl}" style="background:#ef4444;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;">
          Update Payment Method
        </a>
      </p>
    `,
  });
}
