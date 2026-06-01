import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppStoreProvider } from "@/lib/store";
import { FiltersProvider } from "@/lib/filtersContext";
import { AppShell } from "@/components/AppShell";
import { Analytics } from "@vercel/analytics/next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Saldo Real — finanças locais e privadas",
  description:
    "Saldo Real é o seu painel financeiro local: importe faturas, projete saldo, defina orçamentos e nada sai do navegador.",
  openGraph: {
    title: "Saldo Real",
    description: "Painel financeiro local e privado.",
    type: "website",
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
        <AppStoreProvider>
          <FiltersProvider>
            <AppShell>{children}</AppShell>
          </FiltersProvider>
        </AppStoreProvider>
      </body>
    </html>
  );
}
