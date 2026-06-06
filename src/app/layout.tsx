import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Palacio CMS — Gestión de Landing Pages",
  description: "Palacio CMS: Plataforma profesional para gestionar landing pages con editor visual en tiempo real.",
  keywords: ["Palacio", "CMS", "Headless", "Landing Pages", "Next.js", "TypeScript", "Editor Visual"],
  authors: [{ name: "Palacio CMS" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "Palacio CMS",
    description: "Gestión de Landing Pages",
    siteName: "Palacio CMS",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Palacio CMS",
    description: "Gestión de Landing Pages",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
