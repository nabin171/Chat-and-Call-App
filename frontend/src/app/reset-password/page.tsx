
"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { AlertIcon, ChatBubbleIcon, EyeIcon, EyeOffIcon } from "@/components/Icons";

const field =
    "w-full rounded-xl border border-line bg-surface-2 px-3.5 py-2.5 text-sm text-ink " +
    "placeholder:text-muted/70 outline-none transition " +
    "focus:border-accent focus:bg-surface focus:ring-4 focus:ring-accent/15";

function ResetPasswordForm() {
    const router = useRouter();
    const token = useSearchParams().get("token") ?? "";

    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [show, setShow] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password !== confirm) {
            setError("Those two passwords don't match.");
            return;
        }
        if (password.length < 8) {
            setError("Use at least 8 characters.");
            return;
        }

        setBusy(true);
        try {
            await api.post("/users/reset-password", { token, new_password: password });
            router.replace("/login?reset=1");
        } catch (err: unknown) {
            const detail =
                typeof err === "object" && err !== null && "response" in err
                    ? (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail
                    : undefined;
            setError(
                typeof detail === "string"
                    ? detail
                    : "Could not reset your password. Request a fresh link and try again."
            );
            setBusy(false);
        }
    };

    if (!token) {
        return (
            <>
                <h1 className="text-[26px] font-semibold tracking-tight text-ink">Link looks broken</h1>
                <p className="mt-3 flex items-start gap-2 rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger">
                    <AlertIcon className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>This URL has no reset token. Request a new link.</span>
                </p>
                <p className="mt-6 text-center text-sm text-muted">
                    <Link href="/forgot-password" className="font-medium text-accent hover:underline">
                        Request a reset link
                    </Link>
                </p>
            </>
        );
    }

    return (
        <>
            <h1 className="text-[26px] font-semibold tracking-tight text-ink">Set a new password</h1>
            <p className="mt-1.5 text-sm text-muted">Pick something you haven&apos;t used before.</p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div className="space-y-1.5">
                    <label htmlFor="new-password" className="block text-xs font-medium text-muted">
                        New password
                    </label>
                    <div className="relative">
                        <input
                            id="new-password"
                            type={show ? "text" : "password"}
                            autoComplete="new-password"
                            placeholder="At least 8 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`${field} pr-11`}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShow((v) => !v)}
                            aria-label={show ? "Hide password" : "Show password"}
                            aria-pressed={show}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted transition hover:text-ink focus:text-accent focus:outline-none"
                        >
                            {show ? <EyeOffIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
                        </button>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label htmlFor="confirm-password" className="block text-xs font-medium text-muted">
                        Confirm password
                    </label>
                    <input
                        id="confirm-password"
                        type={show ? "text" : "password"}
                        autoComplete="new-password"
                        placeholder="Type it again"
                        value={confirm}
                        onChange={(e) => setConfirm(e.target.value)}
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
                    {busy ? "Updating..." : "Update password"}
                </button>
            </form>
        </>
    );
}

export default function ResetPasswordPage() {
    return (
        <div className="flex min-h-dvh items-center justify-center px-5 py-12">
            <div className="w-full max-w-sm animate-rise">
                <div className="mb-8 flex items-center gap-2.5">
                    <span className="grid h-9 w-9 place-items-center rounded-xl bg-accent text-accent-fg">
                        <ChatBubbleIcon className="h-5 w-5" />
                    </span>
                    <span className="text-[15px] font-semibold tracking-tight text-ink">Chat &amp; Call</span>
                </div>
                <Suspense fallback={<p className="text-sm text-muted">Loading...</p>}>
                    <ResetPasswordForm />
                </Suspense>
            </div>
        </div>
    );
}
