-- ============================================================
-- KORI/GYM — Contract + overdue reminder email templates
-- ============================================================
--
-- One reusable template per gym (single-tenant pilot — no per-plan/
-- per-member templates needed), edited in Settings, rendered by
-- lib/templates.ts's renderTemplate() with {{token}} placeholders and
-- emailed via lib/resend.ts. Defaults below are mirrored verbatim from
-- lib/templates.ts's DEFAULT_CONTRACT_TEMPLATE / DEFAULT_OVERDUE_EMAIL_*
-- constants — keep both in sync if this copy ever changes.

alter table gyms
  add column if not exists contract_template text not null default $DEFAULT$This confirms {{member_name}}'s membership with {{gym_name}} on the {{plan_name}} plan, starting {{start_date}}.

By signing below, {{member_name}} agrees to {{gym_name}}'s membership terms, including billing of {{amount}} and the standard cancellation policy.

Questions? Just reply to this email.$DEFAULT$,
  add column if not exists overdue_email_subject text not null default 'Your payment to {{gym_name}} didn''t go through',
  add column if not exists overdue_email_body text not null default $DEFAULT$Hi {{member_name}},

We tried to collect your {{amount}} payment on {{failed_date}} but it didn't go through. Could you check your bank details are up to date?

If this keeps happening, just reply to this email and we'll sort it out.

Thanks,
{{gym_name}}$DEFAULT$;

-- Set (not the original created_at) whenever a contract is sent or
-- resent, so the Contracts page's "Sent" column reflects the last time
-- the member was actually emailed rather than only ever showing the
-- original creation date. Null until the first send.
alter table contracts
  add column if not exists last_sent_at timestamptz;
