"use server";

import { getGym, getFailedPaymentAlerts, requireSession, DEMO_MODE } from "@/lib/queries";
import { isEmailConfigured, sendOverdueReminderEmail } from "@/lib/resend";
import { renderTemplate } from "@/lib/templates";
import { formatCurrency, formatDate } from "@/utils";

// Fire-and-forget: renders the gym's overdue_email_subject/body and emails
// the member currently shown in the "Needs attention" list. Reuses
// getFailedPaymentAlerts rather than a separate lookup, so what's emailed
// always matches what's on screen. No DB write — there's no reminder-sent
// history/rate-limiting in scope, this is a manual, repeatable nudge.
export async function sendOverdueReminder(
  memberId: string,
  gymId: string
): Promise<{ error: string } | { success: true }> {
  await requireSession();

  const [gym, alerts] = await Promise.all([getGym(), getFailedPaymentAlerts(gymId)]);
  const alert = alerts.find((a) => a.memberId === memberId);
  if (!alert || !alert.memberEmail) {
    return { error: "No overdue payment found for this member — they may have already paid." };
  }

  const tokens = {
    member_name: alert.memberName,
    gym_name: gym.name,
    amount: formatCurrency(alert.amount),
    failed_date: formatDate(alert.failedAt),
  };
  const subject = renderTemplate(gym.overdue_email_subject, tokens);
  const bodyText = renderTemplate(gym.overdue_email_body, tokens);

  if (DEMO_MODE) return { success: true };

  if (!isEmailConfigured()) {
    return { error: "Email sending isn't set up yet, so this reminder wasn't sent." };
  }

  try {
    await sendOverdueReminderEmail({
      to: alert.memberEmail,
      replyTo: gym.email,
      gymName: gym.name,
      logoUrl: gym.logo_url,
      subject,
      bodyText,
    });
  } catch (err) {
    console.error("Failed to send overdue reminder email", err);
    return { error: "Failed to send the reminder email. Try again." };
  }

  return { success: true };
}
