"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, ScrollText } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { listAudit, ApiError, type AuditEntry } from "@/lib/api";

const ACTION: Record<string, { verb: string; tone: string }> = {
  USER_PROVISIONED: { verb: "provisioned", tone: "bg-blue-50 text-blue-700" },
  USER_APPROVED: { verb: "approved", tone: "bg-green-50 text-[#0b6b3a]" },
  USER_REJECTED: { verb: "rejected", tone: "bg-red-50 text-red-700" },
  USER_ROLE_CHANGED: { verb: "changed role of", tone: "bg-neutral-100 text-neutral-600" },
  USER_STATUS_CHANGED: { verb: "changed status of", tone: "bg-amber-50 text-amber-700" },
  USER_PASSWORD_RESET: { verb: "reset password for", tone: "bg-neutral-100 text-neutral-600" },
  SECTION_VERIFIED: { verb: "verified", tone: "bg-green-50 text-[#0b6b3a]" },
  SECTION_RETURNED: { verb: "returned", tone: "bg-amber-50 text-amber-700" },
};

const FILTERS = [
  ["", "All actions"],
  ["USER_APPROVED", "Approvals"],
  ["USER_REJECTED", "Rejections"],
  ["USER_PROVISIONED", "Provisioning"],
  ["USER_STATUS_CHANGED", "Status changes"],
  ["SECTION_VERIFIED", "Verifications"],
  ["SECTION_RETURNED", "Returns"],
] as const;

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function AuditPage() {
  const [rows, setRows] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [action, setAction] = useState("");

  useEffect(() => {
    setLoading(true);
    listAudit({ action: action || undefined, take: 150 })
      .then((r) => {
        setRows(r.rows);
        setTotal(r.total);
      })
      .catch((e) =>
        toast.error(e instanceof ApiError ? e.message : "Couldn't load the log."),
      )
      .finally(() => setLoading(false));
  }, [action]);

  const SELECT =
    "h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b6b3a]/20";

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-neutral-900">
            Audit log
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Record of administrative and verification actions ({total}).
          </p>
        </div>
        <select value={action} onChange={(e) => setAction(e.target.value)} className={SELECT}>
          {FILTERS.map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-[#0b6b3a]" />
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-12 text-center">
          <ScrollText className="mx-auto size-8 text-neutral-300" />
          <p className="mt-2 text-sm text-neutral-500">No entries yet.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((e) => {
            const a = ACTION[e.action] ?? { verb: e.action, tone: "bg-neutral-100 text-neutral-600" };
            const reason = (e.metadata?.reason as string) || null;
            const section = (e.metadata?.section as string) || null;
            return (
              <li
                key={e.id}
                className="flex items-start justify-between gap-3 rounded-lg border border-neutral-200 bg-white px-4 py-3"
              >
                <div className="min-w-0 text-sm">
                  <p className="text-neutral-800">
                    <span className="font-medium text-neutral-900">
                      {e.actorName ?? "System"}
                    </span>{" "}
                    <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", a.tone)}>
                      {a.verb}
                    </span>{" "}
                    <span className="font-medium text-neutral-900">
                      {e.targetLabel ?? e.targetId ?? "—"}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {e.actorRole ?? ""}
                    {section ? ` · ${section}` : ""}
                    {reason ? ` · "${reason}"` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-neutral-400">
                  {relativeTime(e.createdAt)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
