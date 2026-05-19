"use client";

import Link from "next/link";
import InstallButton from "@/components/InstallButton";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/80 px-4 backdrop-blur-lg dark:border-gray-700 dark:bg-gray-900/80">
      <nav className="mx-auto flex max-w-6xl items-center gap-4 py-3">
        <Link href="/" className="text-lg font-bold text-teal-600 dark:text-teal-400">
          Swoff Notes
        </Link>
        <div className="ml-auto flex items-center gap-4 text-sm font-medium">
          <Link href="/" className="text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">Home</Link>
          <Link href="/about" className="text-gray-600 transition hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">About</Link>
          <InstallButton />
        </div>
      </nav>
    </header>
  );
}
