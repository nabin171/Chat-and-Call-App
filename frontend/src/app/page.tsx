"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getToken } from "@/lib/auth";
import { ChatBubbleIcon } from "@/components/Icons";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace(getToken() ? "/chat" : "/login");
  }, [router]);

  return (
    <div className="grid min-h-dvh place-items-center">
      <div className="flex flex-col items-center gap-3 text-muted">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-accent text-accent-fg">
          <ChatBubbleIcon className="h-6 w-6" />
        </span>
        <p className="text-sm">Loading...</p>
      </div>
    </div>
  );
}
