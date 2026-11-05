"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/utils";
import { getSearchMembers, type SearchMember } from "@/app/actions/search";
import { NAV_ITEMS } from "./nav";

const MAX_MEMBERS = 7;

interface Result {
  key: string;
  label: string;
  detail?: string;
  href: string;
  group: "Members" | "Pages";
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [query, setQuery] = useState("");
  const [members, setMembers] = useState<SearchMember[]>([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      setQuery("");
      setActive(0);
      dialog.showModal();
      getSearchMembers().then(setMembers).catch(() => setMembers([]));
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const results = useMemo<Result[]>(() => {
    const q = query.trim().toLowerCase();
    const pages: Result[] = NAV_ITEMS.filter((item) => !q || `${item.en} ${item.reo ?? ""}`.toLowerCase().includes(q)).map((item) => ({
      key: item.href,
      label: item.en,
      href: item.href,
      group: "Pages",
    }));
    if (!q) return pages;

    // Whoever you're typing the name of should come first, not whoever happens
    // to have those letters somewhere in the middle.
    const rank = (name: string) => {
      const lower = name.toLowerCase();
      if (lower.startsWith(q)) return 0;
      return lower.split(" ").some((word) => word.startsWith(q)) ? 1 : 2;
    };

    const matched: Result[] = members
      .filter((member) => `${member.name} ${member.email} ${member.detail}`.toLowerCase().includes(q))
      .sort((a, b) => rank(a.name) - rank(b.name))
      .slice(0, MAX_MEMBERS)
      .map((member) => ({
        key: member.id,
        label: member.name,
        detail: member.detail,
        href: `/dashboard/members/${member.id}`,
        group: "Members",
      }));
    return [...matched, ...pages];
  }, [query, members]);

  function go(result: Result | undefined) {
    if (!result) return;
    onClose();
    router.push(result.href);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      go(results[active]);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
      aria-label="Find a member or page"
      className="mx-auto mt-[12dvh] mb-auto w-[calc(100%-2rem)] max-w-xl max-h-[70dvh] overflow-hidden open:animate-[rise_180ms_var(--ease)]"
    >
      <input
        role="combobox"
        aria-expanded="true"
        aria-controls="palette-results"
        aria-activedescendant={results[active] ? `palette-${results[active].key}` : undefined}
        aria-label="Find a member or page"
        autoComplete="off"
        spellCheck={false}
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={handleKeyDown}
        placeholder="Find a member or page"
        className="w-full h-13 px-4 bg-transparent text-base text-fg outline-none border-b border-line"
      />
      <ul id="palette-results" role="listbox" aria-label="Results" className="max-h-[52dvh] overflow-y-auto py-1">
        {results.map((result, index) => {
          const firstOfGroup = index === 0 || results[index - 1].group !== result.group;
          return (
            <li
              key={result.key}
              id={`palette-${result.key}`}
              role="option"
              aria-selected={index === active}
              onClick={() => go(result)}
              onMouseEnter={() => setActive(index)}
              className={cn("px-4 py-2 cursor-pointer", index === active && "bg-glow", firstOfGroup && index > 0 && "mt-1 border-t border-line")}
            >
              {firstOfGroup && <p className="label mb-1" aria-hidden>{result.group}</p>}
              <div className="flex items-baseline justify-between gap-4">
                <span className="truncate">{result.label}</span>
                {result.detail && <span className="label truncate">{result.detail}</span>}
              </div>
            </li>
          );
        })}
        {results.length === 0 && <li className="px-4 py-6 text-center text-fg-3">Nothing matches that.</li>}
      </ul>
    </dialog>
  );
}
