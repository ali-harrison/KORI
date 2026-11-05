"use client";

import { useEffect, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { Badge, Button, Input, buttonClass } from "@/components/ui";
import { updateGym } from "@/app/actions/gym";
import { ContractTemplateBuilder } from "@/components/dashboard/ContractTemplateBuilder";
import { ReminderTemplateBuilder } from "@/components/dashboard/ReminderTemplateBuilder";
import { AppearanceCard } from "@/components/dashboard/AppearanceCard";
import { SavedNote, SettingsSection } from "@/components/dashboard/SettingsSection";
import type { ClientGym } from "@/types";

interface Props {
  gym: ClientGym;
  isDemo: boolean;
}

const GC_ERRORS: Record<string, string> = {
  missing_params: "Invalid response from GoCardless.",
  state_mismatch: "OAuth state mismatch — please try again.",
  exchange_failed: "Failed to exchange authorisation code.",
  not_configured: "GoCardless isn't set up on this deployment yet.",
};

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
      setGcNotice({ type: "error", message: GC_ERRORS[searchParams.get("gc_error")!] ?? "GoCardless connection failed." });
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
    <div className="enter border-b border-line">
      <SettingsSection title="Gym profile" description="Shown on contracts and reminder emails." status={saved ? <SavedNote /> : undefined}>
        <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
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
          {error && <p role="alert" className="text-accent text-[13px]">{error}</p>}
          <Button variant="primary" type="submit" loading={isPending}>Save changes</Button>
        </form>
      </SettingsSection>

      <SettingsSection
        title="Direct debit"
        description="Collect member payments through GoCardless, straight into your bank account."
        status={<Badge variant={gym.gc_organisation_id ? "success" : "warning"}>{gym.gc_organisation_id ? "Connected" : "Setup required"}</Badge>}
      >
        {gcNotice && <p role="status" className={`text-[13px] mb-3 ${gcNotice.type === "success" ? "text-ok" : "text-accent"}`}>{gcNotice.message}</p>}
        {gym.gc_organisation_id ? (
          <p className="text-fg-2">Organisation <span className="font-mono text-[13px]">{gym.gc_organisation_id}</span></p>
        ) : (
          <a href="/api/gocardless/connect" className={buttonClass("primary")}>Connect GoCardless</a>
        )}
      </SettingsSection>

      <ContractTemplateBuilder gym={gym} />
      <ReminderTemplateBuilder gym={gym} />
      <AppearanceCard />
    </div>
  );
}
