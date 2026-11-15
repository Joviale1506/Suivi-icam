import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Providers } from "@/components/providers/theme-provider";
import { AnimatedBackground } from "@/components/shell/shell";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Mon Suivi ICAM", template: "%s · Mon Suivi ICAM" },
  description: "Compétences PITCH, planning HyperPlanning et fiches de révision",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f4fb" },
    { media: "(prefers-color-scheme: dark)", color: "#07070e" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <Providers>
          <AnimatedBackground />
          {children}
        </Providers>
      </body>
    </html>
  );
}
