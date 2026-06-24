"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ClipboardCheck,
  GraduationCap,
  Loader2,
  School as SchoolIcon,
  ShieldAlert,
  UserCheck,
  Users,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getAdminSummary,
  ApiError,
  type AdminSummary,
} from "@/lib/api";
import { useAuth } from "./app-shell";
import { isAdmin, canVerify, canViewRisk } from "@/lib/access";

export function AdminDashboard() {
  const user = useAuth();
  const [data, setData] = useState<AdminSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAdminSummary()
      .then(setData)
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Couldn't load the dashboard."),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[#0b6b3a]" />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="mx-auto max-w-md rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <AlertCircle className="mx-auto size-8 text-red-500" />
        <p className="mt-2 text-sm text-red-700">{error ?? "No data."}</p>
      </div>
    );
  }

  const { totals, capture, verification, risk, byLga, session } = data;
  const riskTotal = risk.High + risk.Moderate + risk.Low;
  const role = user.role;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-neutral-900">
          Welcome, {user.firstName}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          State-wide overview{session ? ` · Session ${session.name}` : " · No active session"}
        </p>
      </div>

      {!session && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          No active academic session. Set one under Sessions to enable capture.
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Schools" value={totals.schools} icon={SchoolIcon} tone="brand" />
        <Kpi label="Active inspectors" value={totals.activeInspectors} icon={Users} tone="brand" />
        <Kpi label="Awaiting verification" value={verification.sectionsAwaiting} icon={ClipboardCheck} tone="blue" hint={`${verification.schoolsAwaiting} schools`} link={canVerify(role) ? "/admin/submissions" : undefined} />
        <Kpi label="High-risk schools" value={risk.High} icon={ShieldAlert} tone="red" hint={`of ${riskTotal} assessed`} link={canViewRisk(role) ? "/admin/risk" : undefined} />
      </div>

      {/* Capture progress */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-heading text-lg font-semibold text-neutral-900">
            Capture progress
          </h2>
          <span className="text-sm text-neutral-500">
            {capture.completionRate}% complete
          </span>
        </div>
        <StackedBar
          segments={[
            { label: "Verified", value: capture.verified, color: "bg-[#0b6b3a]" },
            { label: "Submitted", value: capture.submitted, color: "bg-blue-500" },
            { label: "In progress", value: capture.draft, color: "bg-amber-400" },
            { label: "Not started", value: capture.notStarted, color: "bg-neutral-200" },
          ]}
          total={totals.schools}
        />
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-neutral-600">
          <Legend color="bg-[#0b6b3a]" label="Verified" value={capture.verified} />
          <Legend color="bg-blue-500" label="Submitted" value={capture.submitted} />
          <Legend color="bg-amber-400" label="In progress" value={capture.draft} />
          <Legend color="bg-neutral-300" label="Not started" value={capture.notStarted} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Risk distribution */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="font-heading text-lg font-semibold text-neutral-900">
            Vulnerability tiers
          </h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            {riskTotal} submitted assessment{riskTotal === 1 ? "" : "s"}
          </p>
          <div className="mt-4 space-y-3">
            <TierBar label="High" value={risk.High} total={riskTotal} color="bg-red-500" />
            <TierBar label="Moderate" value={risk.Moderate} total={riskTotal} color="bg-amber-400" />
            <TierBar label="Low" value={risk.Low} total={riskTotal} color="bg-[#0b6b3a]" />
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm text-neutral-600">
            <GraduationCap className="size-4 text-neutral-400" />
            {totals.enrolment.toLocaleString()} students enrolled (captured)
          </div>
        </div>

        {/* By LGA */}
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <h2 className="font-heading text-lg font-semibold text-neutral-900">
            Completion by LGA
          </h2>
          {byLga.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">No schools yet.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {byLga.slice(0, 8).map((l) => (
                <div key={l.lga}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-700">{l.lga}</span>
                    <span className="text-neutral-500">
                      {l.completed}/{l.schools} · {l.completionRate}%
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-[#0b6b3a]"
                      style={{ width: `${l.completionRate}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick links (only what this role can reach) */}
      <div className="flex flex-wrap gap-3">
        {isAdmin(role) && (
          <QuickLink href="/admin/approvals" icon={UserCheck} label="Review approvals" />
        )}
        {canVerify(role) && (
          <QuickLink href="/admin/submissions" icon={ClipboardCheck} label="Verify submissions" />
        )}
        {canViewRisk(role) && (
          <QuickLink href="/admin/risk" icon={ShieldAlert} label="Risk overview" />
        )}
      </div>
    </div>
  );
}

const TONES = {
  brand: "bg-[#0b6b3a]/10 text-[#0b6b3a]",
  blue: "bg-blue-100 text-blue-700",
  red: "bg-red-100 text-red-700",
} as const;

function Kpi({
  label,
  value,
  icon: Icon,
  tone,
  hint,
  link,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof TONES;
  hint?: string;
  link?: string;
}) {
  const body = (
    <div className={cn("rounded-xl border border-neutral-200 bg-white p-4", link && "transition-colors hover:border-[#0b6b3a]/40")}>
      <span className={cn("flex size-9 items-center justify-center rounded-lg", TONES[tone])}>
        <Icon className="size-4.5" />
      </span>
      <p className="mt-3 font-heading text-2xl font-semibold text-neutral-900">{value}</p>
      <p className="text-xs text-neutral-500">{label}</p>
      {hint && <p className="mt-0.5 text-[0.7rem] text-neutral-400">{hint}</p>}
    </div>
  );
  return link ? <Link href={link}>{body}</Link> : body;
}

function StackedBar({
  segments,
  total,
}: {
  segments: { label: string; value: number; color: string }[];
  total: number;
}) {
  return (
    <div className="mt-4 flex h-3 w-full overflow-hidden rounded-full bg-neutral-100">
      {total > 0 &&
        segments.map((s) =>
          s.value > 0 ? (
            <div
              key={s.label}
              className={s.color}
              style={{ width: `${(s.value / total) * 100}%` }}
              title={`${s.label}: ${s.value}`}
            />
          ) : null,
        )}
    </div>
  );
}

function Legend({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-2.5 rounded-full", color)} />
      {label} <span className="font-medium text-neutral-900">{value}</span>
    </span>
  );
}

function TierBar({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-neutral-700">{label}</span>
        <span className="text-neutral-500">{value}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-neutral-100">
        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-2 text-sm font-medium text-neutral-700 transition-colors hover:border-[#0b6b3a]/40 hover:text-[#0b6b3a]"
    >
      <Icon className="size-4" />
      {label}
    </Link>
  );
}
