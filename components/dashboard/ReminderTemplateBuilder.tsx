"use client";

import { useState, useTransition } from "react";
import { Button, Input, Textarea } from "@/components/ui";
import { SavedNote, SettingsSection } from "@/components/dashboard/SettingsSection";
import { updateReminderTemplate } from "@/app/actions/gym";
import { renderTemplate } from "@/lib/templates";
import type { ClientGym } from "@/types";

// Sample data for the live preview only — real token substitution always
// happens server-side at actual send time (app/actions/reminders.ts).
const SAMPLE_TOKENS = {
  member_name: "Aroha Ngata",
  amount: "$18.00",
  failed_date: "10 Jun 2026",
};

interface Props {
  gym: ClientGym;
}

export function ReminderTemplateBuilder({ gym }: Props) {
  const [subject, setSubject] = useState(gym.overdue_email_subject);
  const [body, setBody] = useState(gym.overdue_email_body);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateReminderTemplate(gym.id, formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  const tokens = { ...SAMPLE_TOKENS, gym_name: gym.name };
  const previewSubject = renderTemplate(subject, tokens);
  const previewBody = renderTemplate(body, tokens);

  return (
    <SettingsSection
      title="Overdue reminder"
      description="Sent when you remind a member about a failed payment."
      status={saved ? <SavedNote /> : undefined}
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <form onSubmit={handleSubmit} className="space-y-3 min-w-0">
          <Input label="Subject" name="overdue_email_subject" value={subject} onChange={(e) => setSubject(e.target.value)} />
          <Textarea
            label="Body"
            name="overdue_email_body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            hint="Available: {{member_name}}, {{gym_name}}, {{amount}}, {{failed_date}}"
          />
          {error && <p role="alert" className="text-accent text-[13px]">{error}</p>}
          <Button variant="primary" type="submit" loading={isPending}>Save template</Button>
        </form>
        <ReminderEmailPreview gym={gym} subject={previewSubject} bodyText={previewBody} />
      </div>
    </SettingsSection>
  );
}

// Light-background DOM mimic of lib/resend.ts's renderEmailShell — same
// structure (logo/name header, rendered body, footer line), styled to
// read as "this is the email," not another dashboard panel.
function ReminderEmailPreview({ gym, subject, bodyText }: { gym: ClientGym; subject: string; bodyText: string }) {
  const paragraphs = bodyText.split(/\n{2,}/);

  return (
    <div className="bg-paper text-paper-ink p-5 text-xs leading-relaxed overflow-y-auto max-h-[460px]">
      {gym.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={gym.logo_url} alt={gym.name} className="h-8 mb-3 object-contain" />
      ) : (
        <p className="text-sm mb-3">{gym.name}</p>
      )}
      <p className="text-[10px] text-paper-muted mb-1 uppercase tracking-wide">Subject</p>
      <p className="text-[13px] mb-4">{subject}</p>
      {paragraphs.map((p, i) => (
        <p key={i} className="mb-2.5 whitespace-pre-line">{p}</p>
      ))}
      <p className="text-[10px] text-paper-muted mt-6">Sent by {gym.name} via kori/os.</p>
    </div>
  );
}
