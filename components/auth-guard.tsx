"use client";

import { useEffect, useCallback, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { onAuthExpired } from "@/util/server";

interface AuthGuardProps {
  children: ReactNode;
}

/**
 * AuthGuard component that listens for authentication expiration events
 * and automatically redirects to the login page when the token expires.
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();

  const handleAuthExpired = useCallback(() => {
    // Redirect to login page when auth expires
    router.replace("/login");
  }, [router]);

  useEffect(() => {
    // Subscribe to auth expiration events
    const unsubscribe = onAuthExpired(handleAuthExpired);

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [handleAuthExpired]);

  return <>{children}</>;
}
