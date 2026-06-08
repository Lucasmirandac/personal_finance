import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { PwaRegister } from "@/components/PwaRegister";
import { Analytics } from "@vercel/analytics/next";
import { ConsentBanner } from "@/components/ConsentBanner";
import { GAScripts } from "@/components/GAScripts";
import { getSiteUrl } from "@/lib/marketing/site";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "Saldo Real — finanças locais e privadas",
    template: "%s | Saldo Real",
  },
  description:
    "Saldo Real é o seu painel financeiro local: importe faturas, projete saldo, defina orçamentos e nada sai do navegador.",
  applicationName: "Saldo Real",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Saldo Real",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/pwa/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/pwa/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Saldo Real",
    description: "Painel financeiro local e privado.",
    type: "website",
    locale: "pt_BR",
    siteName: "Saldo Real",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f2ea" },
    { media: "(prefers-color-scheme: dark)", color: "#12100d" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <Analytics />
        <GAScripts />
        <ConsentBanner />
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
