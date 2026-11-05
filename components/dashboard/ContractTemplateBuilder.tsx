"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, Button } from "@/components/ui";
import { Textarea } from "@/components/ui/Input";
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
    <Card id="contract-template">
      <CardHeader className="pb-5 mb-5">
        <CardTitle description="Rendered into the PDF attached when you send a contract to a member">
          Contract template
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <form onSubmit={handleSubmit} className="space-y-3">
          <Textarea
            name="contract_template"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={12}
            hint="Available: {{member_name}}, {{gym_name}}, {{plan_name}}, {{amount}}, {{start_date}}"
          />
          {error && <p className="text-xs text-[#cf9a90]">{error}</p>}
          <div className="flex justify-end pt-1">
            <Button variant="primary" size="sm" type="submit" loading={isPending}>
              Save template
            </Button>
          </div>
        </form>
        <ContractPdfPreview gym={gym} bodyText={previewBody} memberName={SAMPLE_TOKENS.member_name} />
      </div>
    </Card>
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
    <div className="rounded-[10px] bg-[#e9e7e2] p-5 text-[#1a1a1a] text-[10px] leading-relaxed overflow-y-auto max-h-[420px]">
      {gym.logo_url ? (
        <img src={gym.logo_url} alt={gym.name} className="h-8 mb-2 object-contain" />
      ) : (
        <div className="text-sm font-medium mb-0.5">{gym.name}</div>
      )}
      {gym.logo_url && <div className="text-sm font-medium mb-0.5">{gym.name}</div>}
      {contactLine && <div className="text-[9px] text-[#666] mb-3">{contactLine}</div>}
      <div className="border-b border-[#ccc] mb-3" />
      <div className="text-[11px] font-medium uppercase tracking-wide mb-3">Membership Agreement</div>
      {paragraphs.map((p, i) => (
        <p key={i} className="mb-2.5 whitespace-pre-line">{p}</p>
      ))}
      <div className="flex justify-between mt-8 gap-4">
        <div className="flex-1">
          <div className="border-b border-[#1a1a1a] h-6" />
          <div className="text-[9px] text-[#666] mt-1">{memberName} — Member</div>
        </div>
        <div className="flex-1">
          <div className="border-b border-[#1a1a1a] h-6" />
          <div className="text-[9px] text-[#666] mt-1">Gym Owner — {gym.name}</div>
        </div>
      </div>
    </div>
  );
}
