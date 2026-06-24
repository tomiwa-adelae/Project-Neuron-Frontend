"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, Loader2, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getRiskOverview,
  ApiError,
  type RiskOverviewResponse,
} from "@/lib/api";

type TierFilter = "ALL" | "High" | "Moderate" | "Low";

const TIER_STYLE: Record<string, string> = {
  High: "bg-red-50 text-red-700 ring-red-200",
  Moderate: "bg-amber-50 text-amber-700 ring-amber-200",
  Low: "bg-green-50 text-[#0b6b3a] ring-green-200",
};

const CARD_STYLE: Record<"High" | "Moderate" | "Low", string> = {
  High: "border-red-200 bg-red-50 text-red-700",
  Moderate: "border-amber-200 bg-amber-50 text-amber-700",
  Low: "border-green-200 bg-green-50 text-[#0b6b3a]",
};

export default function RiskOverviewPage() {
  const [data, setData] = useState<RiskOverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<TierFilter>("ALL");

  useEffect(() => {
    getRiskOverview()
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Couldn't load risk data."),
      )
      .finally(() => setLoading(false));
  }, []);

  const items = useMemo(() => {
    const rows = data?.items ?? [];
    return filter === "ALL" ? rows : rows.filter((r) => r.riskTier === filter);
  }, [data, filter]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[#0b6b3a]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto size-8 text-red-500" />
        <p className="mt-2 text-sm text-red-700">{error}</p>
      </div>
    );
  }

  const tiers = data?.tiers ?? { High: 0, Moderate: 0, Low: 0 };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-neutral-900">
          Risk overview
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Submitted school vulnerability assessments
          {data?.session ? ` · Session ${data.session.name}` : ""}, ranked by
          composite risk.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {(["High", "Moderate", "Low"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(filter === t ? "ALL" : t)}
            className={cn(
              "rounded-xl border p-4 text-left transition-all",
              CARD_STYLE[t],
              filter === t ? "ring-2 ring-offset-1 ring-current" : "opacity-90 hover:opacity-100",
            )}
          >
            <ShieldAlert className="size-5" />
            <p className="mt-2 font-heading text-2xl font-semibold">{tiers[t]}</p>
            <p className="text-xs font-medium">{t} risk</p>
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
          {(data?.items.length ?? 0) === 0
            ? "No submitted assessments yet."
            : "No schools in this tier."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
              <tr>
                <th className="px-4 py-2.5 font-medium">School</th>
                <th className="px-4 py-2.5 text-right font-medium">Iso</th>
                <th className="px-4 py-2.5 text-right font-medium">Infra</th>
                <th className="px-4 py-2.5 text-right font-medium">Comm</th>
                <th className="px-4 py-2.5 text-right font-medium">Composite</th>
                <th className="px-4 py-2.5 font-medium">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {items.map((r) => (
                <tr key={r.schoolId} className="hover:bg-neutral-50">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/admin/submissions/${r.schoolId}`}
                      className="font-medium text-neutral-900 hover:text-[#0b6b3a]"
                    >
                      {r.name}
                    </Link>
                    <p className="text-xs text-neutral-500">{r.lgaName}</p>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-neutral-600">
                    {r.isolationScore?.toFixed(0) ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-neutral-600">
                    {r.infrastructureScore?.toFixed(0) ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-neutral-600">
                    {r.communicationScore?.toFixed(0) ?? "—"}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-neutral-900">
                    {r.compositeRiskScore?.toFixed(1) ?? "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    {r.riskTier && (
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                          TIER_STYLE[r.riskTier],
                        )}
                      >
                        {r.riskTier}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
