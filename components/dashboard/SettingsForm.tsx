"use client";

import { useState, useTransition, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { updateGym } from "@/app/actions/gym";
import { ContractTemplateBuilder } from "@/components/dashboard/ContractTemplateBuilder";
import { ReminderTemplateBuilder } from "@/components/dashboard/ReminderTemplateBuilder";
import { AppearanceCard } from "@/components/dashboard/AppearanceCard";
import type { ClientGym } from "@/types";

interface Props {
  gym: ClientGym;
  isDemo: boolean;
}

export function SettingsForm({ gym, isDemo }: Props) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [gcNotice, setGcNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("gc_connected") === "1") {
      setGcNotice({ type: "success", message: "GoCardless connected successfully." });
    } else if (searchParams.get("gc_error")) {
      const code = searchParams.get("gc_error");
      const messages: Record<string, string> = {
        missing_params: "Invalid response from GoCardless.",
        state_mismatch: "OAuth state mismatch — please try again.",
        exchange_failed: "Failed to exchange authorisation code.",
        not_configured: "GoCardless isn't set up on this deployment yet.",
      };
      setGcNotice({ type: "error", message: messages[code!] ?? "GoCardless connection failed." });
    }
  }, [searchParams]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaved(false);
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateGym(gym.id, formData);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Gym profile */}
      <Card>
        <CardHeader className="pb-5 mb-5">
          <CardTitle description="Your gym's public details">Gym Profile</CardTitle>
          {saved && (
            <span className="text-xs text-[#5fc9a4] flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Saved
            </span>
          )}
        </CardHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Gym name" name="name" defaultValue={gym.name} required />
          <Input label="Address" name="address" defaultValue={gym.address ?? ""} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Phone" name="phone" defaultValue={gym.phone ?? ""} />
            <Input label="Email" name="email" type="email" defaultValue={gym.email ?? ""} />
          </div>
          <Input
            label="Logo URL"
            name="logo_url"
            defaultValue={gym.logo_url ?? ""}
            placeholder="https://…"
            disabled={isDemo}
            hint={isDemo ? "Turned off in the demo." : "Paste a link to your logo — shown on contract and reminder emails."}
          />
          {error && <p className="text-xs text-[#cf9a90]">{error}</p>}
          <div className="flex justify-end pt-1">
            <Button variant="primary" size="sm" type="submit" loading={isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </Card>

      {/* GoCardless */}
      <Card>
        <CardHeader className="pb-5 mb-5">
          <CardTitle description="Collect member direct debits via GoCardless">
            Direct Debit
          </CardTitle>
          <Badge variant={gym.gc_organisation_id ? "success" : "warning"} dot>
            {gym.gc_organisation_id ? "Connected" : "Setup required"}
          </Badge>
        </CardHeader>
        <div className="space-y-4">
          {gcNotice && (
            <p className={`text-xs ${gcNotice.type === "success" ? "text-[#5fc9a4]" : "text-[#cf9a90]"}`}>
              {gcNotice.message}
            </p>
          )}
          <p className="text-xs text-[#8f978f] leading-relaxed">
            Connect your GoCardless account to collect recurring direct debits from members.
            Funds go directly to your bank account on your GoCardless settlement schedule.
          </p>
          <div className="flex flex-wrap items-center gap-3 p-4 rounded-[8px] bg-[#0d100e] border border-[#1f2420]">
            <div className="w-8 h-8 rounded-[7px] bg-[#151a16] border border-[#232823] flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#8f978f]">
                <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 10h20" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="6" cy="15" r="1" fill="currentColor" />
                <circle cx="10" cy="15" r="1" fill="currentColor" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              {gym.gc_organisation_id ? (
                <>
                  <p className="text-xs font-medium text-[#e7eae8]">Connected</p>
                  <p className="text-[10px] text-[#646c66]">
                    Organisation: {gym.gc_organisation_id}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium text-[#e7eae8]">Not connected</p>
                  <p className="text-[10px] text-[#646c66]">
                    Link GoCardless to enable direct debit billing
                  </p>
                </>
              )}
            </div>
            {!gym.gc_organisation_id && (
              <a href="/api/gocardless/connect">
                <Button variant="primary" size="sm" type="button">
                  Connect GoCardless
                </Button>
              </a>
            )}
          </div>
        </div>
      </Card>

      <ContractTemplateBuilder gym={gym} />
      <ReminderTemplateBuilder gym={gym} />
      <AppearanceCard />
    </div>
  );
}
