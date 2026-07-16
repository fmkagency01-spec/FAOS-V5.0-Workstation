import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "FAOS v5.0 — Central Operating Dashboard",
  description:
    "FAOSV 5.0 Central ERP Workstation — powered by Aigorithm & TAC Core Brain",
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <body className="bg-fmkDark text-slate-100 antialiased">{children}</body>
    </html>
  );
}
