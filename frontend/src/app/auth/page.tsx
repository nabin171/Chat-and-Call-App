"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * The old combined /auth screen is gone - it is now /login and /signup.
 * Kept as a redirect so existing bookmarks and links do not 404.
 */
export default function AuthRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login");
  }, [router]);

  return null;
}
