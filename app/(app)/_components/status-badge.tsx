import { cn } from "@/lib/utils";
import type { CaptureStatus } from "@/lib/api";

const STYLES: Record<CaptureStatus, { label: string; className: string }> = {
  NOT_STARTED: {
    label: "Not started",
    className: "bg-neutral-100 text-neutral-600 ring-neutral-200",
  },
  DRAFT: {
    label: "In progress",
    className: "bg-amber-50 text-amber-700 ring-amber-200",
  },
  SUBMITTED: {
    label: "Submitted",
    className: "bg-blue-50 text-blue-700 ring-blue-200",
  },
  VERIFIED: {
    label: "Verified",
    className: "bg-green-50 text-[#0b6b3a] ring-green-200",
  },
};

export function StatusBadge({
  status,
  className,
}: {
  status: CaptureStatus;
  className?: string;
}) {
  const s = STYLES[status] ?? STYLES.NOT_STARTED;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        s.className,
        className,
      )}
    >
      {s.label}
    </span>
  );
}
