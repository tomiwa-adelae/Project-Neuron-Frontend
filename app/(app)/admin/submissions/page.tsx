"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronRight, ClipboardCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import {
  getSubmissions,
  ApiError,
  type SubmissionsResponse,
  type SectionKey,
  type CaptureStatus,
} from "@/lib/api";

const SECTIONS: { key: SectionKey; short: string }[] = [
  { key: "security", short: "Sec" },
  { key: "asc", short: "ASC" },
  { key: "students", short: "Stu" },
  { key: "staff", short: "Stf" },
  { key: "media", short: "Med" },
];

const DOT: Record<CaptureStatus, string> = {
  NOT_STARTED: "bg-neutral-200 text-neutral-500",
  DRAFT: "bg-amber-100 text-amber-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  VERIFIED: "bg-green-100 text-[#0b6b3a]",
};

export default function SubmissionsPage() {
  const [data, setData] = useState<SubmissionsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSubmissions()
      .then(setData)
      .catch((e) =>
        toast.error(e instanceof ApiError ? e.message : "Couldn't load submissions."),
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

  const items = data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-neutral-900">
          Submissions
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Schools with sections submitted for verification
          {data?.session ? ` · Session ${data.session.name}` : ""}.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <Stat label="Schools awaiting" value={data?.summary.schoolsAwaiting ?? 0} />
        <Stat label="Sections to verify" value={data?.summary.sectionsAwaiting ?? 0} />
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-12 text-center">
          <CheckCircle2 className="mx-auto size-8 text-[#0b6b3a]" />
          <p className="mt-2 text-sm text-neutral-500">
            Nothing awaiting verification right now.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {items.map((s) => (
            <li key={s.schoolId}>
              <Link
                href={`/admin/submissions/${s.schoolId}`}
                className="flex items-center justify-between gap-4 px-4 py-3 transition-colors hover:bg-neutral-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {s.name}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    {s.code} · {s.lgaName}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <div className="hidden gap-1 sm:flex">
                    {SECTIONS.map(({ key, short }) => (
                      <span
                        key={key}
                        title={`${short}: ${s.sections[key]}`}
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[0.65rem] font-semibold",
                          DOT[s.sections[key]],
                        )}
                      >
                        {short}
                      </span>
                    ))}
                  </div>
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
                    {s.submittedCount} to verify
                  </span>
                  <ChevronRight className="size-4 text-neutral-300" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="flex items-center gap-2">
        <ClipboardCheck className="size-4 text-[#0b6b3a]" />
        <p className="font-heading text-2xl font-semibold text-neutral-900">
          {value}
        </p>
      </div>
      <p className="mt-1 text-xs text-neutral-500">{label}</p>
    </div>
  );
}
