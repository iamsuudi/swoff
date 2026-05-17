"use client";

import { useEffect } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { initServiceWorker } from "@/swoff/sw-injector";
import Header from "@/components/Header";
import UpdatePrompt from "@/components/UpdatePrompt";
import SWProgressBar from "@/components/SWProgressBar";
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
    initServiceWorker();
  }, []);

  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <link rel="manifest" href="/manifest.json" />
        <SWProgressBar />
        <Header />
        <main className="flex-1">{children}</main>
        <UpdatePrompt />
      </body>
    </html>
  );
}
