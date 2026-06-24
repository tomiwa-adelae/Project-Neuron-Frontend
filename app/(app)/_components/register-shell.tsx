"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "./status-badge";
import type { CaptureStatus } from "@/lib/api";

export function RegisterShell({
  schoolId,
  title,
  subtitle,
  status,
  hasSession,
  headerAction,
  onSubmit,
  submitting,
  submitDisabled,
  children,
}: {
  schoolId: string;
  title: string;
  subtitle: string;
  status: CaptureStatus;
  hasSession: boolean;
  headerAction?: React.ReactNode;
  onSubmit: () => void;
  submitting: boolean;
  submitDisabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 pb-24">
      <Link
        href={`/schools/${schoolId}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-neutral-500 hover:text-neutral-800"
      >
        <ArrowLeft className="size-4" />
        Back to school
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-neutral-900">
            {title}
          </h1>
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        </div>
        <StatusBadge status={status} />
      </div>

      {!hasSession ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          Capture is paused until an administrator configures the current academic
          session.
        </div>
      ) : (
        <>
          {headerAction && (
            <div className="flex justify-end">{headerAction}</div>
          )}
          {children}

          <div className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-200 bg-white/90 backdrop-blur lg:left-64">
            <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3 sm:px-6">
              <p className="text-xs text-neutral-500">
                {status === "SUBMITTED"
                  ? "Submitted — edits will reopen this section as a draft."
                  : "Add all records, then submit the section."}
              </p>
              <Button
                onClick={onSubmit}
                disabled={submitting || submitDisabled}
                className="h-10 bg-[#0b6b3a] text-white hover:bg-[#095a31]"
              >
                {submitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Send className="size-4" />
                )}
                Submit section
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
