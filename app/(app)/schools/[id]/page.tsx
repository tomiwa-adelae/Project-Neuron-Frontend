"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  MapPin,
  ShieldAlert,
  Users,
  Image as ImageIcon,
  GraduationCap,
} from "lucide-react";

import { cn } from "@/lib/utils";
import {
  getSchool,
  ApiError,
  type SchoolDetail,
  type CaptureStatus,
} from "@/lib/api";
import { StatusBadge } from "../../_components/status-badge";

const TYPE_LABEL: Record<string, string> = {
  PRIMARY: "Primary",
  JSS: "JSS",
  SSS: "SSS",
  COMBINED_PRY_JSS: "Primary + JSS",
  COMBINED_JSS_SSS: "JSS + SSS",
  COMBINED_PRY_SSS: "Primary–SSS",
};
const cap = (s: string) =>
  s
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const TIER_STYLE: Record<string, string> = {
  High: "bg-red-50 text-red-700 ring-red-200",
  Moderate: "bg-amber-50 text-amber-700 ring-amber-200",
  Low: "bg-green-50 text-[#0b6b3a] ring-green-200",
};

export default function SchoolDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [data, setData] = useState<SchoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSchool(id)
      .then((d) => active && setData(d))
      .catch((err) => {
        if (!active) return;
        setError(
          err instanceof ApiError ? err.message : "Couldn't load this school.",
        );
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

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
        <p className="mt-2 text-sm text-red-700">{error ?? "Not found."}</p>
        <Link
          href="/schools"
          className="mt-4 inline-block text-sm font-medium text-[#0b6b3a] hover:underline"
        >
          Back to schools
        </Link>
      </div>
    );
  }

  const { school, session, visit, security } = data;
  const sections = visit?.sections;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <Link
        href="/schools"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="size-4" />
        Schools
      </Link>

      {/* Master record */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="font-heading text-2xl font-semibold text-neutral-900">
              {school.name}
            </h1>
            <p className="mt-1 text-sm text-neutral-500">
              {school.code} · {TYPE_LABEL[school.type] ?? school.type} ·{" "}
              {cap(school.ownership)}
            </p>
          </div>
          {session && (
            <span className="rounded bg-[#0b6b3a]/10 px-2.5 py-1 text-xs font-semibold text-[#0b6b3a]">
              Session {session.name}
            </span>
          )}
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
          <Detail label="Boarding" value={cap(school.category)} />
          <Detail label="Students served" value={cap(school.genderCategory)} />
          <Detail label="LGA" value={school.lgaName} />
          <Detail label="Cluster" value={school.cluster ?? "—"} />
          <Detail label="Ward / community" value={school.ward ?? school.community ?? "—"} />
          <Detail
            label="GPS"
            value={
              school.latitude != null && school.longitude != null
                ? `${school.latitude.toFixed(4)}, ${school.longitude.toFixed(4)}`
                : "Not captured"
            }
          />
          <Detail label="Address" value={school.address ?? "—"} />
        </dl>
      </div>

      {/* Risk summary (only once a security assessment is submitted) */}
      {security?.recordStatus === "SUBMITTED" && security.riskTier && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-heading text-lg font-semibold text-neutral-900">
              Vulnerability risk profile
            </h2>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset",
                TIER_STYLE[security.riskTier],
              )}
            >
              <ShieldAlert className="size-4" />
              {security.riskTier} risk
            </span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Score label="Isolation" value={security.isolationScore} />
            <Score label="Infrastructure" value={security.infrastructureScore} />
            <Score label="Communication" value={security.communicationScore} />
            <Score
              label="Composite"
              value={security.compositeRiskScore}
              emphasize
            />
          </div>
        </div>
      )}

      {/* Capture sections */}
      <div>
        <h2 className="mb-3 font-heading text-lg font-semibold text-neutral-900">
          Field capture
        </h2>
        {!session && (
          <div className="mb-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            No active session — capture is paused until an administrator sets the
            current session.
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <SectionCard
            href={session ? `/schools/${id}/security` : undefined}
            icon={ShieldAlert}
            title="Security & Vulnerability"
            desc="Modules A–D · risk scoring"
            status={sections?.security ?? "NOT_STARTED"}
            primary
          />
          <SectionCard
            href={session ? `/schools/${id}/asc` : undefined}
            icon={GraduationCap}
            title="Annual School Census"
            desc="Enrolment by class & gender"
            status={sections?.asc ?? "NOT_STARTED"}
          />
          <SectionCard
            href={session ? `/schools/${id}/students` : undefined}
            icon={Users}
            title="Student Register"
            desc="One record per student"
            status={sections?.students ?? "NOT_STARTED"}
          />
          <SectionCard
            href={session ? `/schools/${id}/staff` : undefined}
            icon={ClipboardList}
            title="Staff Register"
            desc="One record per staff member"
            status={sections?.staff ?? "NOT_STARTED"}
          />
          <SectionCard
            href={session ? `/schools/${id}/media` : undefined}
            icon={ImageIcon}
            title="Media Capture"
            desc="Photos by category"
            status={sections?.media ?? "NOT_STARTED"}
          />
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-neutral-400">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-neutral-800">{value}</dd>
    </div>
  );
}

function Score({
  label,
  value,
  emphasize,
}: {
  label: string;
  value: number | null;
  emphasize?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        emphasize ? "border-[#0b6b3a]/30 bg-[#0b6b3a]/5" : "border-neutral-200",
      )}
    >
      <p className="text-xs text-neutral-400">{label}</p>
      <p
        className={cn(
          "mt-1 font-heading text-xl font-semibold",
          emphasize ? "text-[#0b6b3a]" : "text-neutral-900",
        )}
      >
        {value != null ? value.toFixed(1) : "—"}
      </p>
    </div>
  );
}

function SectionCard({
  href,
  icon: Icon,
  title,
  desc,
  status,
  primary,
}: {
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  status: CaptureStatus;
  primary?: boolean;
}) {
  const inner = (
    <div
      className={cn(
        "flex h-full items-center justify-between gap-3 rounded-xl border bg-white p-4 transition-colors",
        href
          ? "border-neutral-200 hover:border-[#0b6b3a]/40 hover:bg-neutral-50"
          : "border-neutral-200 opacity-70",
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            primary ? "bg-[#0b6b3a]/10 text-[#0b6b3a]" : "bg-neutral-100 text-neutral-500",
          )}
        >
          <Icon className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900">
            {title}
          </p>
          <p className="truncate text-xs text-neutral-500">{desc}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge status={status} />
        {href ? (
          <ChevronRight className="size-4 text-neutral-300" />
        ) : (
          <span className="text-[0.65rem] font-medium uppercase text-neutral-400">
            Soon
          </span>
        )}
      </div>
    </div>
  );

  return href ? <Link href={href}>{inner}</Link> : inner;
}
