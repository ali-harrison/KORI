"use client";

import { useState, useTransition } from "react";
import { Button, Textarea } from "@/components/ui";
import { SavedNote, SettingsSection } from "@/components/dashboard/SettingsSection";
import { updateContractTemplate } from "@/app/actions/gym";
import { renderTemplate } from "@/lib/templates";
import type { ClientGym } from "@/types";

// Sample data for the live preview only — real token substitution always
// happens server-side at actual send time (app/actions/contracts.ts).
const SAMPLE_TOKENS = {
  member_name: "Aroha Ngata",
  plan_name: "Weekly Direct Debit",
  amount: "$18/wk",
  start_date: "12 Aug 2026",
};

interface Props {
  gym: ClientGym;
}

export function ContractTemplateBuilder({ gym }: Props) {
  const [value, setValue] = useState(gym.contract_template);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateContractTemplate(gym.id, formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  const previewBody = renderTemplate(value, { ...SAMPLE_TOKENS, gym_name: gym.name });

  return (
    <SettingsSection
      id="contract-template"
      title="Contract template"
      description="Rendered into the PDF attached when you send a contract to a member."
      status={saved ? <SavedNote /> : undefined}
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <form onSubmit={handleSubmit} className="space-y-3 min-w-0">
          <Textarea
            aria-label="Contract template"
            name="contract_template"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={12}
            hint="Available: {{member_name}}, {{gym_name}}, {{plan_name}}, {{amount}}, {{start_date}}"
          />
          {error && <p role="alert" className="text-accent text-[13px]">{error}</p>}
          <Button variant="primary" type="submit" loading={isPending}>Save template</Button>
        </form>
        <ContractPdfPreview gym={gym} bodyText={previewBody} memberName={SAMPLE_TOKENS.member_name} />
      </div>
    </SettingsSection>
  );
}

// Light-background DOM mimic of the actual PDF layout (lib/contract-pdf.tsx)
// — same content structure (letterhead, divider, body, signature footer),
// styled as a page rather than an app panel so it visually reads as "this
// is the document," not another dashboard card.
function ContractPdfPreview({ gym, bodyText, memberName }: { gym: ClientGym; bodyText: string; memberName: string }) {
  const paragraphs = bodyText.split(/\n{2,}/);
  const contactLine = [gym.address, gym.phone, gym.email].filter(Boolean).join(" · ");

  return (
    <div className="bg-paper text-paper-ink p-5 text-[11px] leading-relaxed overflow-y-auto max-h-[420px]">
      {gym.logo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={gym.logo_url} alt={gym.name} className="h-8 mb-2 object-contain" />
      ) : (
        <p className="text-sm mb-0.5">{gym.name}</p>
      )}
      {gym.logo_url && <p className="text-sm mb-0.5">{gym.name}</p>}
      {contactLine && <p className="text-[10px] text-paper-muted mb-3">{contactLine}</p>}
      <div className="border-b border-paper-line mb-3" />
      <p className="text-[11px] uppercase tracking-wide mb-3">Membership Agreement</p>
      {paragraphs.map((p, i) => (
        <p key={i} className="mb-2.5 whitespace-pre-line">{p}</p>
      ))}
      <div className="flex justify-between mt-8 gap-4">
        <div className="flex-1">
          <div className="border-b border-paper-ink h-6" />
          <p className="text-[10px] text-paper-muted mt-1">{memberName} — Member</p>
        </div>
        <div className="flex-1">
          <div className="border-b border-paper-ink h-6" />
          <p className="text-[10px] text-paper-muted mt-1">Gym Owner — {gym.name}</p>
        </div>
      </div>
    </div>
  );
}
