"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/auth-client";
import { setAuth } from "@/swoff/auth/store";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@swoff.dev");
  const [password, setPassword] = useState("password123");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error: signInError } = await signIn.email({ email, password });
      if (signInError) {
        setError(signInError.message || "Login failed");
        return;
      }
      if (data?.user) {
        await setAuth({ user: data.user });
        window.dispatchEvent(new CustomEvent("sw-auth-state-change"));
      }
      router.push("/notes");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <form
        onSubmit={handleSubmit}
        className="bg-white dark:bg-gray-800 p-8 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm w-full max-w-md"
      >
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
          Sign In
        </h1>
        {error && (
          <p className="text-red-500 dark:text-red-400 mb-4 text-sm">{error}</p>
        )}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
          />
        </div>
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 rounded-lg bg-linear-to-r from-teal-500 to-emerald-600 text-white font-semibold shadow-lg shadow-teal-500/25 transition hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-4 text-center">
          Don&apos;t have an account?{" "}
          <Link
            href="/register"
            className="text-teal-600 dark:text-teal-400 hover:underline"
          >
            Register
          </Link>
        </p>
      </form>
    </div>
  );
}
