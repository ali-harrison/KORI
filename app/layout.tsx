import type { Metadata, Viewport } from "next";
import { Inter_Tight, Fragment_Mono } from "next/font/google";
import { APPEARANCE_SCRIPT } from "@/lib/appearance";
import "./globals.css";

// latin-ext carries the macrons: ā, ē, ī, ō, ū.
const interTight = Inter_Tight({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500"],
  variable: "--font-inter-tight",
  display: "swap",
});

const fragmentMono = Fragment_Mono({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  variable: "--font-fragment-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "kori/os — Gym Management",
    template: "%s · kori/os",
  },
  description: "Gym management for NZ gyms: members, direct debit, contracts and overdue reminders, on one ledger.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0e0d0b" },
    { media: "(prefers-color-scheme: light)", color: "#f2eee6" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // suppressHydrationWarning: the head script sets the theme on <html> before
    // React loads, which is the point.
    <html lang="en" suppressHydrationWarning className={`${interTight.variable} ${fragmentMono.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_SCRIPT }} />
      </head>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
