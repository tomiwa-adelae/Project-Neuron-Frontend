"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, ChevronRight, Loader2, MapPin, Search, WifiOff } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  getSchools,
  ApiError,
  type SchoolWorklistItem,
  type CaptureStatus,
  type AcademicSession,
} from "@/lib/api";
import { cacheSchools, readCachedSchools } from "@/lib/offline/schools";
import { StatusBadge } from "../_components/status-badge";

type Filter = "ALL" | CaptureStatus;

const SCHOOL_TYPE_LABEL: Record<string, string> = {
  PRIMARY: "Primary",
  JSS: "JSS",
  SSS: "SSS",
  COMBINED_PRY_JSS: "Primary + JSS",
  COMBINED_JSS_SSS: "JSS + SSS",
  COMBINED_PRY_SSS: "Primary–SSS",
};

const FILTERS: [Filter, string][] = [
  ["ALL", "All"],
  ["NOT_STARTED", "Not started"],
  ["DRAFT", "In progress"],
  ["SUBMITTED", "Submitted"],
  ["VERIFIED", "Verified"],
];

export default function SchoolsPage() {
  const [schools, setSchools] = useState<SchoolWorklistItem[]>([]);
  const [session, setSession] = useState<AcademicSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState<{ stale: boolean } | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await getSchools();
        if (!active) return;
        setSchools(res.schools);
        setSession(res.session);
        setOffline(null);
        // Mirror the scoped worklist for offline search (best-effort).
        void cacheSchools(res.session, res.schools);
      } catch (err) {
        if (!active) return;
        // On a network failure, fall back to the cached registry so the LIE can
        // still browse/search schools offline.
        const isNetwork = err instanceof ApiError && err.status === 0;
        const cached = isNetwork ? await readCachedSchools() : null;
        if (!active) return;
        if (cached && cached.schools.length > 0) {
          setSchools(cached.schools);
          setSession(cached.session);
          setOffline({ stale: cached.stale });
        } else {
          setError(
            err instanceof ApiError ? err.message : "Couldn't load schools.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
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
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        (s.community ?? "").toLowerCase().includes(q)
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

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-neutral-900">
          Schools
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {schools.length} school{schools.length === 1 ? "" : "s"} in your scope
          {session ? ` · Session ${session.name}` : ""}
        </p>
      </div>

      {offline && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <WifiOff className="mt-0.5 size-4 shrink-0" />
          <span>
            You&rsquo;re offline — showing the last saved school list
            {offline.stale ? " (over a week old; reconnect to refresh)" : ""}.
            New captures will sync when you&rsquo;re back online.
          </span>
        </div>
      )}

      <div className="rounded-xl border border-neutral-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 p-4">
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
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search schools"
              className="h-10 pl-9 text-sm"
            />
          </div>
        </div>

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
                    <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-neutral-500">
                      <span>
                        {s.code} · {SCHOOL_TYPE_LABEL[s.type] ?? s.type}
                      </span>
                      {s.community && (
                        <>
                          <MapPin className="size-3" />
                          {s.community}
                        </>
                      )}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={s.status} />
                    <ChevronRight className="size-4 text-neutral-300" />
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
