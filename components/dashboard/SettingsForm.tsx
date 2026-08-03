"use client";

import { useState, useTransition, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardHeader, CardTitle, Badge, Button } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { updateGym } from "@/app/actions/gym";
import type { Gym } from "@/types";

interface Props {
  gym: Gym;
}

export function SettingsForm({ gym }: Props) {
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
      if (result?.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    });
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Gym profile */}
      <Card>
        <CardHeader className="pb-5 mb-5">
          <CardTitle description="Your gym's public details">Gym Profile</CardTitle>
          {saved && (
            <span className="text-xs text-[#10b981] flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <path d="M3 8l3.5 3.5L13 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Saved
            </span>
          )}
        </CardHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Gym name" name="name" defaultValue={gym.name} required />
            <Input
              label="Slug"
              name="slug"
              defaultValue={gym.slug}
              hint={`kori.gym/${gym.slug}`}
              disabled
            />
          </div>
          <Input label="Address" name="address" defaultValue={gym.address ?? ""} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Phone" name="phone" defaultValue={gym.phone ?? ""} />
            <Input label="Email" name="email" type="email" defaultValue={gym.email ?? ""} />
          </div>
          {error && <p className="text-xs text-[#ef4444]">{error}</p>}
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
            <p className={`text-xs ${gcNotice.type === "success" ? "text-[#10b981]" : "text-[#ef4444]"}`}>
              {gcNotice.message}
            </p>
          )}
          <p className="text-xs text-[#888888] leading-relaxed">
            Connect your GoCardless account to collect recurring direct debits from members.
            Funds go directly to your bank account on your GoCardless settlement schedule.
          </p>
          <div className="flex items-center gap-3 p-4 rounded-[6px] bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]">
            <div className="w-8 h-8 rounded-[6px] bg-[rgba(255,255,255,0.06)] flex items-center justify-center flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-[#888888]">
                <rect x="2" y="5" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <path d="M2 10h20" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="6" cy="15" r="1" fill="currentColor" />
                <circle cx="10" cy="15" r="1" fill="currentColor" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              {gym.gc_organisation_id ? (
                <>
                  <p className="text-xs font-medium text-[#f5f5f5]">Connected</p>
                  <p className="text-[10px] text-[#444444]">
                    Organisation: {gym.gc_organisation_id}
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs font-medium text-[#f5f5f5]">Not connected</p>
                  <p className="text-[10px] text-[#444444]">
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

      {/* Notifications */}
      <Card>
        <CardHeader className="pb-5 mb-5">
          <CardTitle description="Email alert preferences">Notifications</CardTitle>
        </CardHeader>
        <div className="space-y-1">
          {[
            { label: "Payment failed", description: "Alert when a member payment fails", enabled: true },
            { label: "New member signup", description: "Notify when someone joins", enabled: true },
            { label: "Contract signed", description: "Notify when a contract is signed", enabled: false },
            { label: "Membership expiring soon", description: "7 days before expiry", enabled: true },
          ].map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between py-3 border-b border-[rgba(255,255,255,0.04)] last:border-0"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-[#f5f5f5]">{item.label}</span>
                <span className="text-[10px] text-[#444444]">{item.description}</span>
              </div>
              <button
                className={`relative rounded-full border transition-all duration-150 flex-shrink-0 ${
                  item.enabled
                    ? "bg-[rgba(232,255,71,0.15)] border-[rgba(232,255,71,0.3)]"
                    : "bg-[rgba(255,255,255,0.04)] border-[rgba(255,255,255,0.08)]"
                }`}
                style={{ width: 32, height: 18 }}
              >
                <span
                  className={`absolute top-[3px] w-3 h-3 rounded-full transition-all duration-150 ${
                    item.enabled ? "left-[17px] bg-[#e8ff47]" : "left-[3px] bg-[#444444]"
                  }`}
                />
              </button>
            </div>
          ))}
        </div>
      </Card>

      {/* Danger zone */}
      <Card>
        <CardHeader className="pb-5 mb-5">
          <CardTitle description="Irreversible actions">Danger Zone</CardTitle>
        </CardHeader>
        <div className="flex items-center justify-between p-4 rounded-[6px] border border-[rgba(239,68,68,0.15)] bg-[rgba(239,68,68,0.04)]">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-[#f5f5f5]">Delete gym</span>
            <span className="text-[10px] text-[#888888]">
              Permanently delete all data. Cannot be undone.
            </span>
          </div>
          <Button variant="danger" size="sm">Delete gym</Button>
        </div>
      </Card>
    </div>
  );
}
