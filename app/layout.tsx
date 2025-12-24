import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "./styles/onchainkit.css";
import { AppProviders } from "@/components/app-providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Permit2 Panic Button",
  description:
    "Scan, score, and revoke Permit2 allowances on Ethereum and Base with a panic button.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AppProviders>
          <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-foreground">
            {children}
          </main>
        </AppProviders>
      </body>
    </html>
  );
}
