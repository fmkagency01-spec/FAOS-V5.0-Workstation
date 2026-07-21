import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { PwaRegister } from "@/components/faos/PwaRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "FAOS v5.0 — Master Workstation",
  description:
    "TAC Central Brain — voice-to-voice JARVIS, multimodal uploads, PWA, multi-tenant RBAC ERP",
  applicationName: "FAOS Workstation",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FAOS",
  },
  icons: {
    icon: [
      { url: "/icons/faos.svg", type: "image/svg+xml" },
      { url: "/icons/faos-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/faos-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/faos-192.png", sizes: "192x192", type: "image/png" }],
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#060b19",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="bn">
      <body className="bg-fmkDark text-slate-100 antialiased min-h-[100dvh]">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
