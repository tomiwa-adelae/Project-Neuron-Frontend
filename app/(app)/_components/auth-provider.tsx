"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { getMe, ApiError, type MeResponse } from "@/lib/api";

// ─── Auth context ─────────────────────────────────────────────────────────────
//
// Holds the authenticated user and gates rendering of the app until identity is
// resolved. This is chrome-free: it only fetches, guards, and provides context —
// the visual layout (sidebar/topbar) lives in the route layout, not here.

const AuthContext = createContext<MeResponse | null>(null);

export function useAuth(): MeResponse {
  const user = useContext(AuthContext);
  if (!user) {
    // The provider only renders children once a user is loaded, so this is a
    // programming error (using the hook outside the provider) rather than a state.
    throw new Error("useAuth must be used within AuthProvider");
  }
  return user;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Client-side guard: the JWT lives in an httpOnly cookie on the API origin,
  // so identity is resolved by calling /auth/me from the browser. A 401/403
  // bounces to /login.
  useEffect(() => {
    let active = true;
    getMe()
      .then((me) => {
        if (active) setUser(me);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/login");
        } else {
          toast.error("Couldn't load your session. Please sign in again.");
          router.replace("/login");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-neutral-100">
        <Loader2 className="size-6 animate-spin text-[#0b6b3a]" />
      </div>
    );
  }

  return <AuthContext.Provider value={user}>{children}</AuthContext.Provider>;
}
