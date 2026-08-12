// Framework-free merge-field rendering — no Supabase/Next imports, so it's
// directly unit testable the same way lib/gocardless-webhook.ts and
// lib/member-cancellation.ts are. Owner-edited template text (contract,
// overdue reminder) lives on the gyms row as plain strings with
// {{token}} placeholders; this is the one place that resolves them.

export function renderTemplate(template: string, tokens: Record<string, string>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key: string) => tokens[key] ?? "");
}

// Mirrored verbatim into supabase/migrations/20240009_contract_and_reminder_templates.sql
// as the column DEFAULTs (SQL can't import a TS constant) — keep both in
// sync if this copy ever changes. Also reused directly by DEV_GYM in
// lib/dev-data.ts so dev mode exercises the real default copy.

export const DEFAULT_CONTRACT_TEMPLATE = `This confirms {{member_name}}'s membership with {{gym_name}} on the {{plan_name}} plan, starting {{start_date}}.

By signing below, {{member_name}} agrees to {{gym_name}}'s membership terms, including billing of {{amount}} and the standard cancellation policy.

Questions? Just reply to this email.`;

export const DEFAULT_OVERDUE_EMAIL_SUBJECT = "Your payment to {{gym_name}} didn't go through";

export const DEFAULT_OVERDUE_EMAIL_BODY = `Hi {{member_name}},

We tried to collect your {{amount}} payment on {{failed_date}} but it didn't go through. Could you check your bank details are up to date?

If this keeps happening, just reply to this email and we'll sort it out.

Thanks,
{{gym_name}}`;
