"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Loader2,
  MapPin,
  Search,
  School as SchoolIcon,
} from "lucide-react";

import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  getLieDashboardSummary,
  getSchools,
  ApiError,
  type LieDashboardSummary,
  type SchoolWorklistItem,
  type CaptureStatus,
} from "@/lib/api";
import { useAuth } from "./_components/app-shell";
import { StatusBadge } from "./_components/status-badge";
import { AdminDashboard } from "./_components/admin-dashboard";
import { canViewAdminDashboard, isCaptureRole } from "@/lib/access";

export default function DashboardHome() {
  const user = useAuth();
  if (canViewAdminDashboard(user.role)) return <AdminDashboard />;
  if (isCaptureRole(user.role)) return <LieDashboard />;
  return <RolePending name={user.firstName} role={user.role} />;
}

// Graceful landing for roles whose workspace isn't built yet (e.g. INSPECT_OFFICER).
function RolePending({ name, role }: { name: string; role: string }) {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center">
      <h1 className="font-heading text-xl font-semibold text-neutral-900">
        Welcome, {name}
      </h1>
      <p className="mt-2 text-sm text-neutral-500">
        Your workspace for the{" "}
        <span className="font-medium text-neutral-700">{role}</span> role is being
        set up. Check back soon.
      </p>
    </div>
  );
}

type Filter = "ALL" | CaptureStatus;

const SCHOOL_TYPE_LABEL: Record<string, string> = {
  PRIMARY: "Primary",
  JSS: "JSS",
  SSS: "SSS",
  COMBINED_PRY_JSS: "Primary + JSS",
  COMBINED_JSS_SSS: "JSS + SSS",
  COMBINED_PRY_SSS: "Primary–SSS",
};

function LieDashboard() {
  const user = useAuth();
  const [summary, setSummary] = useState<LieDashboardSummary | null>(null);
  const [schools, setSchools] = useState<SchoolWorklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  useEffect(() => {
    let active = true;
    Promise.all([getLieDashboardSummary(), getSchools()])
      .then(([s, list]) => {
        if (!active) return;
        setSummary(s);
        setSchools(list.schools);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Couldn't load your dashboard.",
        );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return schools.filter((s) => {
      if (filter !== "ALL" && s.status !== filter) return false;
      if (!q) return true;
      return (
        s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
      );
    });
  }, [schools, query, filter]);

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

  const counts = summary?.counts;

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      {/* Greeting */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-neutral-900">
            Welcome, {user.firstName}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-neutral-500">
            {summary?.assignedLga || summary?.assignedCluster ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" />
                {summary.assignedLga
                  ? `${summary.assignedLga} LGA`
                  : `${summary.assignedCluster} cluster`}
              </span>
            ) : (
              <span className="text-amber-600">No area assigned yet</span>
            )}
            {summary?.session && (
              <>
                <span className="text-neutral-300">·</span>
                <span>Session {summary.session.name}</span>
              </>
            )}
          </p>
        </div>
      </div>

      {/* No session warning */}
      {summary && !summary.session && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          No active academic session has been configured. Capture is paused until
          an administrator sets the current session.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Assigned schools"
          value={counts?.total ?? 0}
          icon={SchoolIcon}
          tone="brand"
        />
        <StatCard
          label="Completed"
          value={summary?.completed ?? 0}
          icon={CheckCircle2}
          tone="green"
        />
        <StatCard
          label="In progress"
          value={counts?.inProgress ?? 0}
          icon={ClipboardList}
          tone="amber"
        />
        <StatCard
          label="Not started"
          value={counts?.notStarted ?? 0}
          icon={AlertCircle}
          tone="neutral"
        />
      </div>

      {/* Completion */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-neutral-700">
            Session progress
          </span>
          <span className="text-neutral-500">
            {summary?.completed ?? 0} of {counts?.total ?? 0} schools ·{" "}
            {summary?.completionRate ?? 0}%
          </span>
        </div>
        <Progress
          value={summary?.completionRate ?? 0}
          className="mt-3 h-2 bg-neutral-100 [&_[data-slot=progress-indicator]]:bg-[#0b6b3a]"
        />
      </div>

      {/* Worklist */}
      <div className="rounded-xl border border-neutral-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-4">
          <h2 className="font-heading text-lg font-semibold text-neutral-900">
            School worklist
          </h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or code"
              className="h-10 pl-9 text-sm"
            />
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2 px-4 pt-4">
          {(
            [
              ["ALL", "All"],
              ["NOT_STARTED", "Not started"],
              ["DRAFT", "In progress"],
              ["SUBMITTED", "Submitted"],
              ["VERIFIED", "Verified"],
            ] as [Filter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                filter === value
                  ? "bg-[#0b6b3a] text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-neutral-500">
            {schools.length === 0
              ? "No schools in your assigned area yet."
              : "No schools match this filter."}
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100 p-2">
            {filtered.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/schools/${s.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg px-3 py-3 transition-colors hover:bg-neutral-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-neutral-900">
                      {s.name}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-neutral-500">
                      {s.code} · {SCHOOL_TYPE_LABEL[s.type] ?? s.type}
                      {s.community ? ` · ${s.community}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <StatusBadge status={s.status} />
                    <span className="hidden text-xs font-medium text-[#0b6b3a] sm:inline">
                      {s.status === "NOT_STARTED"
                        ? "Start"
                        : s.status === "DRAFT"
                          ? "Continue"
                          : "View"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

const TONES = {
  brand: "bg-[#0b6b3a]/10 text-[#0b6b3a]",
  green: "bg-green-100 text-[#0b6b3a]",
  amber: "bg-amber-100 text-amber-700",
  neutral: "bg-neutral-100 text-neutral-500",
} as const;

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: keyof typeof TONES;
}) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-lg",
            TONES[tone],
          )}
        >
          <Icon className="size-4.5" />
        </span>
      </div>
      <p className="mt-3 font-heading text-2xl font-semibold text-neutral-900">
        {value}
      </p>
      <p className="text-xs text-neutral-500">{label}</p>
    </div>
  );
}
