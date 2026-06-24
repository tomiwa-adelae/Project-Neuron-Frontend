"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronRight, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getSchools,
  ApiError,
  type SchoolWorklistItem,
  type CaptureStatus,
  type AcademicSession,
} from "@/lib/api";
import { StatusBadge } from "../_components/status-badge";

type Filter = "ACTIVE" | "ALL" | CaptureStatus;

const FILTERS: [Filter, string][] = [
  ["ACTIVE", "In progress"],
  ["SUBMITTED", "Submitted"],
  ["VERIFIED", "Verified"],
  ["ALL", "All assigned"],
];

// Order of the four live capture sections shown as progress chips.
const SECTIONS: {
  key: "security" | "asc" | "students" | "staff" | "media";
  label: string;
  href: string;
}[] = [
  { key: "security", label: "Security", href: "security" },
  { key: "asc", label: "ASC", href: "asc" },
  { key: "students", label: "Students", href: "students" },
  { key: "staff", label: "Staff", href: "staff" },
  { key: "media", label: "Media", href: "media" },
];

const CHIP: Record<CaptureStatus, string> = {
  NOT_STARTED: "bg-neutral-100 text-neutral-500 hover:bg-neutral-200",
  DRAFT: "bg-amber-100 text-amber-700 hover:bg-amber-200",
  SUBMITTED: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  VERIFIED: "bg-green-100 text-[#0b6b3a] hover:bg-green-200",
};

export default function CapturesPage() {
  const [schools, setSchools] = useState<SchoolWorklistItem[]>([]);
  const [session, setSession] = useState<AcademicSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("ACTIVE");

  useEffect(() => {
    let active = true;
    getSchools()
      .then((res) => {
        if (!active) return;
        setSchools(res.schools);
        setSession(res.session);
      })
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof ApiError ? err.message : "Couldn't load captures.",
        );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const filtered = useMemo(() => {
    return schools.filter((s) => {
      if (filter === "ALL") return true;
      if (filter === "ACTIVE") return s.status === "DRAFT";
      return s.status === filter;
    });
  }, [schools, filter]);

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

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-neutral-900">
          My captures
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Track field-capture progress per school
          {session ? ` · Session ${session.name}` : ""}. Open a school, then a
          section, to capture.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
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

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-10 text-center">
          <p className="text-sm text-neutral-500">
            {filter === "ACTIVE"
              ? "No captures in progress. Open a school from "
              : "Nothing here yet. Browse "}
            <Link href="/schools" className="font-medium text-[#0b6b3a] hover:underline">
              Schools
            </Link>
            {filter === "ACTIVE" ? " to start one." : "."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((s) => (
            <li
              key={s.id}
              className="rounded-xl border border-neutral-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <Link href={`/schools/${s.id}`} className="min-w-0 flex-1 group">
                  <p className="truncate text-sm font-medium text-neutral-900 group-hover:text-[#0b6b3a]">
                    {s.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    {s.code}
                    {s.community ? ` · ${s.community}` : ""}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge status={s.status} />
                  <Link
                    href={`/schools/${s.id}`}
                    className="text-neutral-300 hover:text-neutral-500"
                    aria-label="Open school"
                  >
                    <ChevronRight className="size-4" />
                  </Link>
                </div>
              </div>

              {/* Per-section progress — each chip is a direct link into that section. */}
              <div className="mt-3 flex flex-wrap gap-2">
                {SECTIONS.map(({ key, label, href }) => {
                  const status = (s.sections?.[key] ?? "NOT_STARTED") as CaptureStatus;
                  return (
                    <Link
                      key={key}
                      href={`/schools/${s.id}/${href}`}
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                        CHIP[status],
                      )}
                    >
                      {label}
                      <span className="opacity-60">·</span>
                      <span className="capitalize">
                        {status === "NOT_STARTED"
                          ? "start"
                          : status === "DRAFT"
                            ? "draft"
                            : status.toLowerCase()}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
