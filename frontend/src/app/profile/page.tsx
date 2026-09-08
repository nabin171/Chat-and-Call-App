"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { clearToken, getToken } from "@/lib/auth";
import { Avatar } from "@/components/Avatar";
import { AlertIcon, LogoutIcon } from "@/components/Icons";

interface User {
  id: number;
  username: string;
  email: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api
      .get("/users/me")
      .then((res) => setUser(res.data))
      .catch(() => setError("Your session has expired. Please sign in again."));
  }, [router]);

  const logout = () => {
    clearToken();
    router.replace("/login");
  };

  return (
    <div className="grid min-h-dvh place-items-center px-5 py-12">
      <div className="w-full max-w-sm animate-rise">
        {error ? (
          <div className="rounded-2xl border border-line bg-surface p-6 text-center shadow-[var(--shadow-sm)]">
            <span className="mx-auto grid h-11 w-11 place-items-center rounded-xl bg-danger/10 text-danger">
              <AlertIcon />
            </span>
            <p className="mt-4 text-sm text-ink">{error}</p>
            <Link
              href="/login"
              className="mt-5 inline-block rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-accent-fg transition hover:bg-accent-hover"
            >
              Go to sign in
            </Link>
          </div>
        ) : !user ? (
          <p className="text-center text-sm text-muted">Loading...</p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-[var(--shadow-sm)]">
            <div className="flex flex-col items-center px-6 pb-6 pt-8">
              <Avatar name={user.username} seed={user.id} size="xl" />
              <h1 className="mt-4 text-xl font-semibold tracking-tight text-ink">
                {user.username}
              </h1>
              <p className="mt-1 text-sm text-muted">{user.email}</p>
            </div>

            <dl className="border-t border-line">
              <div className="flex items-center justify-between px-6 py-3.5">
                <dt className="text-sm text-muted">User ID</dt>
                <dd className="font-mono text-sm text-ink">{user.id}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-line px-6 py-3.5">
                <dt className="text-sm text-muted">Username</dt>
                <dd className="text-sm text-ink">{user.username}</dd>
              </div>
              <div className="flex items-center justify-between border-t border-line px-6 py-3.5">
                <dt className="text-sm text-muted">Email</dt>
                <dd className="truncate pl-4 text-sm text-ink">{user.email}</dd>
              </div>
            </dl>

            <div className="flex gap-2 border-t border-line p-4">
              <Link
                href="/chat"
                className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-center text-sm font-medium text-accent-fg transition hover:bg-accent-hover"
              >
                Back to chat
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-2 rounded-xl border border-line px-4 py-2.5 text-sm font-medium text-ink transition hover:bg-surface-2 hover:text-danger"
              >
                <LogoutIcon className="h-4 w-4" />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
