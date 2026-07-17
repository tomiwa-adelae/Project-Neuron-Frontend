"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  ClipboardList,
  Image as ImageIcon,
  Loader2,
  ShieldAlert,
  Users,
  UserSquare,
  School as SchoolIcon,
} from "lucide-react";

import {
  getSchools,
  getCurrentPeriod,
  ApiError,
  type SchoolWorklistItem,
  type AcademicSession,
  type CapturePeriod,
} from "@/lib/api";
import { useAuth } from "./auth-provider";
import { StatusBadge } from "./status-badge";

// Section cards, in capture order, keyed to the `sections` map on the worklist item.
const SECTIONS = [
  {
    key: "security" as const,
    label: "Security & Vulnerability",
    href: "security",
    icon: ShieldAlert,
  },
  { key: "asc" as const, label: "Annual School Census", href: "asc", icon: ClipboardList },
  { key: "students" as const, label: "Student Register", href: "students", icon: Users },
  { key: "staff" as const, label: "Staff Register", href: "staff", icon: UserSquare },
  { key: "media" as const, label: "Media Capture", href: "media", icon: ImageIcon },
];

export function PrincipalDashboard() {
  const user = useAuth();
  const [school, setSchool] = useState<SchoolWorklistItem | null>(null);
  const [session, setSession] = useState<AcademicSession | null>(null);
  const [period, setPeriod] = useState<CapturePeriod | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      getSchools(),
      // The current capture period is optional context — tolerate its absence.
      getCurrentPeriod().catch(() => null),
    ])
      .then(([list, per]) => {
        if (!active) return;
        // A principal is scoped to exactly one school server-side.
        setSchool(list.schools[0] ?? null);
        setSession(list.session);
        setPeriod(per);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof ApiError ? err.message : "Couldn't load your school.",
        );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

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

  // No school bound to this principal yet (admin hasn't confirmed the binding).
  if (!school) {
    return (
      <div className="mx-auto mt-10 max-w-md rounded-xl border border-neutral-200 bg-white p-8 text-center">
        <SchoolIcon className="mx-auto size-8 text-neutral-400" />
        <h1 className="mt-3 font-heading text-xl font-semibold text-neutral-900">
          Welcome, {user.firstName}
        </h1>
        <p className="mt-2 text-sm text-neutral-500">
          Your account isn&apos;t linked to a school yet. An administrator will
          confirm your school shortly — check back soon.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Greeting */}
      <div>
        <h1 className="font-heading text-2xl font-semibold text-neutral-900">
          Welcome, {user.firstName}
        </h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-neutral-500">
          <span>
            {session ? `Session ${session.name}` : "No active session configured"}
          </span>
          {period && (
            <>
              <span className="text-neutral-300">·</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#0b6b3a]/10 px-2 py-0.5 text-xs font-medium text-[#0b6b3a]">
                {period.name}
              </span>
            </>
          )}
        </p>
      </div>

      {!session && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          No active academic session has been configured. Capture is paused until
          an administrator sets the current session.
        </div>
      )}

      {/* School header */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-heading text-lg font-semibold text-neutral-900">
              {school.name}
            </h2>
            <p className="mt-0.5 text-xs text-neutral-500">
              {school.code} · {school.lgaName}
              {school.community ? ` · ${school.community}` : ""}
            </p>
          </div>
          <StatusBadge status={school.status} />
        </div>
        <Link
          href={`/schools/${school.id}`}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-[#0b6b3a] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0a5c32]"
        >
          Open full school record
          <ArrowRight className="size-4" />
        </Link>
      </div>

      {/* Section cards */}
      <div>
        <h3 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Capture sections
        </h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {SECTIONS.map(({ key, label, href, icon: Icon }) => {
            const status = school.sections?.[key] ?? "NOT_STARTED";
            return (
              <Link
                key={key}
                href={`/schools/${school.id}/${href}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 transition-colors hover:border-[#0b6b3a]/40 hover:bg-neutral-50"
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-9 items-center justify-center rounded-lg bg-[#0b6b3a]/10 text-[#0b6b3a]">
                    <Icon className="size-4.5" />
                  </span>
                  <span className="text-sm font-medium text-neutral-900">
                    {label}
                  </span>
                </div>
                <StatusBadge status={status} />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
