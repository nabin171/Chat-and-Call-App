"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { AlertIcon, ChatBubbleIcon } from "@/components/Icons";

type Mode = "login" | "signup";

const COPY = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to pick up where you left off.",
    submit: "Sign in",
    busy: "Signing in...",
    footer: "New here?",
    footerLink: "Create an account",
    footerHref: "/signup",
  },
  signup: {
    title: "Create your account",
    subtitle: "Takes a few seconds. No email confirmation needed.",
    submit: "Create account",
    busy: "Creating account...",
    footer: "Already have an account?",
    footerLink: "Sign in",
    footerHref: "/login",
  },
} as const;

export function AuthForm({ mode }: { mode: Mode }) {
  const copy = COPY[mode];
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (mode === "signup") {
        await api.post("/users/register", { email, username, password });
      }
      // Signing up logs you straight in - no reason to make someone type it twice.
      const res = await api.post("/users/login", { email, password });
      setToken(res.data.access_token);
      router.replace("/chat");
    } catch (err: unknown) {
      const detail =
        typeof err === "object" && err !== null && "response" in err
          ? (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail
          : undefined;
      setError(
        typeof detail === "string"
          ? detail
          : Array.isArray(detail)
            ? "Please check the fields above."
            : "Could not reach the server. Is the backend running on port 8000?"
      );
      setBusy(false);
    }
  };

  const field =
    "w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink " +
    "placeholder:text-muted/70 outline-none transition " +
    "focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15";

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-[#12132b] lg:block">
        <div
          aria-hidden
          className="absolute -left-24 -top-24 h-[28rem] w-[28rem] rounded-full opacity-60 blur-3xl"
          style={{ background: "radial-gradient(circle, #6366f1, transparent 65%)" }}
        />
        <div
          aria-hidden
          className="absolute -bottom-32 -right-16 h-[26rem] w-[26rem] rounded-full opacity-50 blur-3xl"
          style={{ background: "radial-gradient(circle, #d946ef, transparent 65%)" }}
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="flex items-center gap-2.5 text-white">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/10 backdrop-blur">
              <ChatBubbleIcon className="h-5 w-5" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">Chat &amp; Call</span>
          </div>

          <div className="max-w-md">
            <h2 className="text-4xl font-semibold leading-tight tracking-tight text-white">
              Messaging and calls,
              <br />
              in real time.
            </h2>
            <p className="mt-4 text-[15px] leading-relaxed text-white/60">
              One-to-one chat, group rooms, and peer-to-peer audio and video &mdash; built on
              WebSockets and WebRTC.
            </p>
            <ul className="mt-8 space-y-2.5 text-sm text-white/70">
              {[
                "Live presence and typing indicators",
                "Group conversations",
                "Audio and video calling",
              ].map((f) => (
                <li key={f} className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-white/40" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          <p className="text-xs text-white/35">
            Built with Next.js, FastAPI, PostgreSQL and Redis.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm animate-rise">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-fg">
              <ChatBubbleIcon className="h-5 w-5" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight text-ink">Chat &amp; Call</span>
          </div>

          <h1 className="text-[26px] font-semibold tracking-tight text-ink">{copy.title}</h1>
          <p className="mt-1.5 text-sm text-muted">{copy.subtitle}</p>

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

            {mode === "signup" && (
              <div className="space-y-1.5">
                <label htmlFor="username" className="block text-xs font-medium text-muted">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="How others will see you"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className={field}
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-medium text-muted">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
              {busy ? copy.busy : copy.submit}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted">
            {copy.footer}{" "}
            <Link href={copy.footerHref} className="font-medium text-accent hover:underline">
              {copy.footerLink}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
