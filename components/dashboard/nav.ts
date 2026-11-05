// reo is only set where a translation was given to us. No invented te reo.
export const NAV_ITEMS: { href: string; reo?: string; en: string }[] = [
  { href: "/dashboard", reo: "Tirohanga", en: "Overview" },
  { href: "/dashboard/members", reo: "Mema", en: "Members" },
  { href: "/dashboard/plans", en: "Plans" },
  { href: "/dashboard/billing", reo: "Utu", en: "Billing" },
  { href: "/dashboard/contracts", en: "Contracts" },
  { href: "/dashboard/settings", reo: "Tautuhinga", en: "Settings" },
];
