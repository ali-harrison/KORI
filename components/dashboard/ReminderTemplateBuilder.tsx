"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, Button } from "@/components/ui";
import { Input, Textarea } from "@/components/ui/Input";
import { updateReminderTemplate } from "@/app/actions/gym";
import { renderTemplate } from "@/lib/templates";
import type { Gym } from "@/types";

// Sample data for the live preview only — real token substitution always
// happens server-side at actual send time (app/actions/reminders.ts).
const SAMPLE_TOKENS = {
  member_name: "Aroha Ngata",
  amount: "$18.00",
  failed_date: "10 Jun 2026",
};

interface Props {
  gym: Gym;
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
      if (result?.error) {
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
    <Card>
      <CardHeader className="pb-5 mb-5">
        <CardTitle description="Sent when you send a reminder to a member with a failed payment">
          Overdue payment reminder
        </CardTitle>
        {saved && (
          <span className="text-xs text-[#5fc9a4] flex items-center gap-1.5">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Saved
          </span>
        )}
      </CardHeader>
      <div className="grid grid-cols-2 gap-5">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            label="Subject"
            name="overdue_email_subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Textarea
            label="Body"
            name="overdue_email_body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={9}
            hint="Available: {{member_name}}, {{gym_name}}, {{amount}}, {{failed_date}}"
          />
          {error && <p className="text-xs text-[#cf9a90]">{error}</p>}
          <div className="flex justify-end pt-1">
            <Button variant="primary" size="sm" type="submit" loading={isPending}>
              Save template
            </Button>
          </div>
        </form>
        <ReminderEmailPreview gym={gym} subject={previewSubject} bodyText={previewBody} />
      </div>
    </Card>
  );
}

// Light-background DOM mimic of lib/resend.ts's renderEmailShell — same
// structure (logo/name header, rendered body, footer line), styled to
// read as "this is the email," not another dashboard panel.
function ReminderEmailPreview({ gym, subject, bodyText }: { gym: Gym; subject: string; bodyText: string }) {
  const paragraphs = bodyText.split(/\n{2,}/);

  return (
    <div className="rounded-[10px] bg-white p-5 text-[#222] text-[11px] leading-relaxed overflow-y-auto max-h-[380px]">
      {gym.logo_url ? (
        <img src={gym.logo_url} alt={gym.name} className="h-8 mb-3 object-contain" />
      ) : (
        <div className="text-sm font-medium mb-3">{gym.name}</div>
      )}
      <div className="text-[10px] text-[#999] mb-1 uppercase tracking-wide">Subject</div>
      <div className="text-[13px] font-medium mb-4">{subject}</div>
      {paragraphs.map((p, i) => (
        <p key={i} className="mb-2.5">{p}</p>
      ))}
      <p className="text-[9px] text-[#999] mt-6">Sent by {gym.name} via kori/os.</p>
    </div>
  );
}
