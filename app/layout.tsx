import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmileCare Dental — AI Receptionist Demo",
  description:
    "Concept demo: an AI receptionist that answers calls, books appointments, and escalates emergencies for a dental clinic. Simulated responses.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-white text-slate-900">{children}</body>
    </html>
  );
}
