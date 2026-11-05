import type { Metadata, Viewport } from "next";
import { Instrument_Sans, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-instrument-sans",
  display: "swap",
});

const splineSansMono = Spline_Sans_Mono({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-spline-sans-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "kori/os — Gym Management",
    template: "%s · kori/os",
  },
  description: "Gym management platform for NZ gyms",
};

export const viewport: Viewport = {
  themeColor: "#0b0d0c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${instrumentSans.variable} ${splineSansMono.variable} h-full`}>
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
