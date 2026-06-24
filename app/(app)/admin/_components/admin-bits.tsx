"use client";

import { cn } from "@/lib/utils";
import { ROLE_OPTIONS, type ScopeInput } from "@/lib/api";
import { TextField } from "../../_components/form-fields";

export function roleLabel(role: string): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-amber-200",
  ACTIVE: "bg-green-50 text-[#0b6b3a] ring-green-200",
  SUSPENDED: "bg-orange-50 text-orange-700 ring-orange-200",
  BANNED: "bg-red-50 text-red-700 ring-red-200",
  REJECTED: "bg-neutral-100 text-neutral-600 ring-neutral-200",
  DEACTIVATED: "bg-neutral-100 text-neutral-500 ring-neutral-200",
};

export function UserStatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        STATUS_STYLE[status] ?? STATUS_STYLE.REJECTED,
      )}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

const FIELD =
  "h-10 w-full rounded-md border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-900 focus-visible:border-[#0b6b3a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b6b3a]/20";

// Role selector + the one geographic scope field that matters for that role.
export function RoleScopeFields({
  value,
  onChange,
}: {
  value: ScopeInput;
  onChange: (v: ScopeInput) => void;
}) {
  const set = (p: Partial<ScopeInput>) => onChange({ ...value, ...p });

  return (
    <>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-neutral-700">
          Role <span className="text-red-500">*</span>
        </label>
        <select
          value={value.role}
          onChange={(e) => set({ role: e.target.value })}
          className={FIELD}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>

      {value.role === "LIE" && (
        <TextField
          label="Assigned LGA"
          value={value.assignedLga}
          onChange={(v) => set({ assignedLga: v })}
          placeholder="e.g. Ibadan North"
        />
      )}
      {value.role === "ZONAL_COORD" && (
        <TextField
          label="Assigned zone"
          value={value.assignedZone}
          onChange={(v) => set({ assignedZone: v })}
          placeholder="e.g. Ibadan Zone"
        />
      )}
      {value.role === "INSPECT_OFFICER" && (
        <TextField
          label="Assigned cluster"
          value={value.assignedCluster}
          onChange={(v) => set({ assignedCluster: v })}
          placeholder="School cluster"
        />
      )}
    </>
  );
}
