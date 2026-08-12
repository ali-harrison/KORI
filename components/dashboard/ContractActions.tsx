"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import { sendContract, markContractSigned, getContractDownloadUrl } from "@/app/actions/contracts";
import type { Contract } from "@/types";

interface Props {
  contract: Contract | null;
  memberId: string;
  gymId: string;
  // "row" — compact, right-aligned inline buttons (Contracts list page).
  // "stack" — full-width, vertically stacked buttons (member detail card).
  layout?: "row" | "stack";
}

// Branches on contract.status for Resend/Mark-as-signed, but Download is
// independent of status — pdf_url is set as soon as a contract is first
// sent (still "pending"), and the PDF's blank signature lines are for a
// manual/physical sign workflow, so downloading before it's marked signed
// is a real use case, not an edge case to hide.
export function ContractActions({ contract, memberId, gymId, layout = "row" }: Props) {
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isDownloading, setIsDownloading] = useState(false);

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

  async function handleDownload() {
    if (!contract) return;
    setNotice(null);
    setIsDownloading(true);
    const result = await getContractDownloadUrl(contract.id, gymId);
    setIsDownloading(false);
    if ("error" in result) {
      setNotice({ type: "error", message: result.error });
    } else {
      window.open(result.url, "_blank", "noopener,noreferrer");
    }
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
        {contract?.pdf_url && (
          <Button variant="ghost" size="sm" className={buttonClassName} onClick={handleDownload} loading={isDownloading}>
            Download
          </Button>
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
