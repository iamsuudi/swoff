"use client";

import { useEffect } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { initServiceWorker } from "@/swoff/client-injector";
import { checkStorage } from "@/swoff/notification";
import Header from "@/components/Header";
import UpdatePrompt from "@/components/UpdatePrompt";
import SWProgressBar from "@/components/SWProgressBar";
import GlobalLoadingBar from "@/components/GlobalLoadingBar";
import NetworkStatusBanner from "@/components/NetworkStatusBanner";
import Footer from "@/components/Footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    const listener = (event: Event) => {
      const { level, code, message } = (event as CustomEvent).detail;
      console.log(`[swoff:${level}] ${code}: ${message}`);
    };
    window.addEventListener("swoff:notification", listener);

    initServiceWorker().then(() => {
      checkStorage();
    });

    return () => window.removeEventListener("swoff:notification", listener);
  }, []);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <link rel="manifest" href="/manifest.json" />
        <GlobalLoadingBar />
        <SWProgressBar />
        <NetworkStatusBanner />
        <Header />
        <main className="flex-1">{children}</main>
        <UpdatePrompt />
        <Footer />
      </body>
    </html>
  );
}
