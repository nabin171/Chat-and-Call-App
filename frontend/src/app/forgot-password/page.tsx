"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { AlertIcon, ChatBubbleIcon, CheckIcon } from "@/components/Icons";

const field =
  "w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink " +
  "placeholder:text-muted/70 outline-none transition " +
  "focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await api.post("/users/forgot-password", { email });
      setSent(true);
    } catch {
      setError("Could not reach the server. Is the backend running on port 8000?");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm animate-rise">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-fg">
            <ChatBubbleIcon className="h-5 w-5" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">
            Chat &amp; Call
          </span>
        </div>

        {sent ? (
          <>
            <h1 className="text-[26px] font-semibold tracking-tight text-ink">
              Check your inbox
            </h1>
            <p className="mt-3 flex items-start gap-2 rounded-xl bg-accent/10 px-3 py-2.5 text-sm text-ink">
              <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <span>
                If <strong>{email}</strong> is registered, a reset link is on its way. It
                expires in 30 minutes.
              </span>
            </p>
            <p className="mt-6 text-center text-sm text-muted">
              <Link href="/login" className="font-medium text-accent hover:underline">
                Back to sign in
              </Link>
            </p>
          </>
        ) : (
          <>
            <h1 className="text-[26px] font-semibold tracking-tight text-ink">
              Reset your password
            </h1>
            <p className="mt-1.5 text-sm text-muted">
              Enter your email and we&apos;ll send you a link to set a new one.
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-medium text-muted">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={field}
                  required
                />
              </div>

              {error && (
                <p
                  role="alert"
                  className="flex items-start gap-2 rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger animate-fade"
                >
                  <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition hover:bg-accent-hover focus:outline-none focus:ring-4 focus:ring-accent/25 disabled:opacity-60"
              >
                {busy ? "Sending..." : "Send reset link"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-muted">
              Remembered it?{" "}
              <Link href="/login" className="font-medium text-accent hover:underline">
                Sign in
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
