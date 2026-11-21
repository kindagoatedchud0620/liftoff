import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import AppShell from "@/components/AppShell";
import HydrationGate from "@/components/HydrationGate";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Liftoff",
  description: "Gamified strength tracking with RPG ranks.",
};

export const viewport: Viewport = { themeColor: "#090D16" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">
        <HydrationGate>
          <AppShell>{children}</AppShell>
        </HydrationGate>
      </body>
    </html>
  );
}
