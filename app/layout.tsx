import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "FAOS v5.2 — JARVIS Business Suite",
  description:
    "Secure JARVIS workstation — role-based login, mobile-ready, 25 shell agents, full ERP",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FAOS",
  },
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>⚡</text></svg>",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#060b19",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <body className="bg-fmkDark text-slate-100 antialiased">{children}</body>
    </html>
  );
}
