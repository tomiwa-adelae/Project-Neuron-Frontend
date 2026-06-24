"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Loader2,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getSchool,
  verifySection,
  returnSection,
  ApiError,
  type SchoolDetail,
  type SectionKey,
  type CaptureStatus,
} from "@/lib/api";
import { StatusBadge } from "../../../_components/status-badge";

const SECTIONS: { key: SectionKey; title: string; href: string }[] = [
  { key: "security", title: "Security & Vulnerability", href: "security" },
  { key: "asc", title: "Annual School Census", href: "asc" },
  { key: "students", title: "Student Register", href: "students" },
  { key: "staff", title: "Staff Register", href: "staff" },
  { key: "media", title: "Media Capture", href: "media" },
];

const TIER_STYLE: Record<string, string> = {
  High: "bg-red-50 text-red-700 ring-red-200",
  Moderate: "bg-amber-50 text-amber-700 ring-amber-200",
  Low: "bg-green-50 text-[#0b6b3a] ring-green-200",
};

export default function SubmissionReviewPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<SchoolDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, startAction] = useTransition();

  const load = () => getSchool(id).then(setData);

  useEffect(() => {
    load()
      .catch((e) =>
        setError(e instanceof ApiError ? e.message : "Couldn't load this school."),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const run = (fn: () => Promise<unknown>, ok: string) =>
    startAction(async () => {
      try {
        await fn();
        await load();
        toast.success(ok);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Action failed.");
      }
    });

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
      </div>
    );
  }

  const { school, security } = data;
  const sections = data.visit?.sections;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <Link
        href="/admin/submissions"
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="size-4" />
        Submissions
      </Link>

      <div>
        <h1 className="font-heading text-2xl font-semibold text-neutral-900">
          {school.name}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {school.code} · {school.lgaName}
          {data.visit ? ` · Overall: ` : ""}
        </p>
        {data.visit && (
          <div className="mt-2">
            <StatusBadge status={data.visit.overallStatus} />
          </div>
        )}
      </div>

      {/* Risk snapshot for context */}
      {security?.riskTier && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4">
          <span className="inline-flex items-center gap-2 text-sm font-medium text-neutral-700">
            <ShieldAlert className="size-4 text-neutral-400" />
            Composite risk {security.compositeRiskScore?.toFixed(1) ?? "—"}
          </span>
          <span
            className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset",
              TIER_STYLE[security.riskTier],
            )}
          >
            {security.riskTier} risk
          </span>
        </div>
      )}

      <div className="space-y-3">
        {SECTIONS.map(({ key, title, href }) => {
          const status = (sections?.[key] ?? "NOT_STARTED") as CaptureStatus;
          const canVerify = status === "SUBMITTED";
          const canReturn = status === "SUBMITTED" || status === "VERIFIED";
          return (
            <div
              key={key}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4"
            >
              <div className="flex items-center gap-3">
                <StatusBadge status={status} />
                <div>
                  <p className="text-sm font-medium text-neutral-900">{title}</p>
                  <Link
                    href={`/schools/${id}/${href}`}
                    className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-[#0b6b3a] hover:underline"
                  >
                    Inspect data <ExternalLink className="size-3" />
                  </Link>
                </div>
              </div>
              <div className="flex gap-2">
                {canReturn && (
                  <Button
                    variant="outline"
                    disabled={busy}
                    onClick={() => run(() => returnSection(id, key), "Returned for revision.")}
                    className="h-9 border-amber-200 text-amber-700 hover:bg-amber-50"
                  >
                    <RotateCcw className="size-4" />
                    Return
                  </Button>
                )}
                <Button
                  disabled={busy || !canVerify}
                  onClick={() => run(() => verifySection(id, key), "Section verified.")}
                  className="h-9 bg-[#0b6b3a] text-white hover:bg-[#095a31] disabled:opacity-40"
                >
                  <CheckCircle2 className="size-4" />
                  Verify
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
