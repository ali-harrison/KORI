"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { sendContract, markContractSigned } from "@/app/actions/contracts";
import type { Contract } from "@/types";

interface Props {
  contract: Contract | null;
  memberId: string;
  gymId: string;
  // "row" — compact, right-aligned inline buttons (Contracts list page).
  // "stack" — full-width, vertically stacked buttons (member detail card).
  layout?: "row" | "stack";
}

// Branches on contract.status, not pdf_url — pdf_url will always be null
// under this feature's scope (no PDF generation), so branching on it would
// show "Resend" forever on an already-signed contract.
export function ContractActions({ contract, memberId, gymId, layout = "row" }: Props) {
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSend() {
    setNotice(null);
    startTransition(async () => {
      const result = await sendContract(memberId, gymId);
      if ("error" in result) {
        setNotice({ type: "error", message: result.error });
      } else {
        setNotice({ type: "success", message: contract ? "Resent." : "Sent." });
        setTimeout(() => setNotice(null), 2500);
      }
    });
  }

  function handleMarkSigned() {
    if (!contract) return;
    setNotice(null);
    startTransition(async () => {
      const result = await markContractSigned(contract.id, gymId, memberId);
      if ("error" in result) setNotice({ type: "error", message: result.error });
    });
  }

  const buttonClassName = layout === "stack" ? "w-full" : undefined;
  const containerClassName = layout === "stack" ? "flex flex-col gap-2" : "flex items-center gap-2 justify-end";
  const noticeClassName = layout === "stack" ? "text-xs mt-1.5" : "text-xs mt-1.5 text-right";

  return (
    <div>
      <div className={containerClassName}>
        {!contract && (
          <Button variant="secondary" size="sm" className={buttonClassName} onClick={handleSend} loading={isPending}>
            Send contract
          </Button>
        )}
        {contract?.status === "pending" && (
          <>
            <Button variant="ghost" size="sm" className={buttonClassName} onClick={handleSend} loading={isPending}>
              Resend
            </Button>
            <Button variant="secondary" size="sm" className={buttonClassName} onClick={handleMarkSigned} loading={isPending}>
              Mark as signed
            </Button>
          </>
        )}
        {contract?.status === "signed" && contract.pdf_url && (
          <a href={contract.pdf_url} target="_blank" rel="noopener noreferrer" className={buttonClassName}>
            <Button variant="ghost" size="sm" className={buttonClassName}>
              Download
            </Button>
          </a>
        )}
      </div>
      {notice && (
        <p className={`${noticeClassName} ${notice.type === "success" ? "text-[#5fc9a4]" : "text-[#cf9a90]"}`}>
          {notice.message}
        </p>
      )}
    </div>
  );
}
