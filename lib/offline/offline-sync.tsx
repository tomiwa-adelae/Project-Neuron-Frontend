"use client";

import { useEffect } from "react";
import { toast } from "sonner";

import { flushOutbox } from "@/lib/offline/queue";

// Flushes the offline outbox when the app opens and whenever the browser regains
// connectivity. Renders nothing. Mounted inside the authenticated layout so the
// replayed requests carry the session cookie.
export function OfflineSync() {
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const { synced } = await flushOutbox(() => {
        toast.error(
          "An offline assessment couldn't be finalised and was kept as a draft. Please review it.",
        );
      });
      if (!cancelled && synced > 0) {
        toast.success(
          `Synced ${synced} offline ${synced === 1 ? "change" : "changes"}.`,
        );
      }
    };

    void run();
    const onOnline = () => void run();
    window.addEventListener("online", onOnline);
    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
    };
  }, []);

  return null;
}
