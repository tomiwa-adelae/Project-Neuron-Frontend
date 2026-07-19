"use client";

import { useEffect, useState } from "react";
import { useFormContext } from "react-hook-form";
import { cn } from "@/lib/utils";
import {
  ROLE_OPTIONS,
  getPublicSchools,
  type PublicSchool,
} from "@/lib/api";
import { RHFText, RHFSelect } from "../../_components/rhf-fields";

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

// Role selector + the one scope field that matters for that role, driven by the
// enclosing react-hook-form (via context). `role` is the caller's watched value.
// Conditional-required scope is enforced by the schema's superRefine (ScopeSchema).
export function RoleScopeFields({ role }: { role: string }) {
  const { control } = useFormContext();
  // School directory for the PRINCIPAL binding. Loaded lazily on first use.
  const [schools, setSchools] = useState<PublicSchool[]>([]);
  useEffect(() => {
    if (role !== "PRINCIPAL" || schools.length) return;
    getPublicSchools()
      .then((r) => setSchools(r.schools))
      .catch(() => {});
  }, [role, schools.length]);

  return (
    <>
      <RHFSelect control={control} name="role" label="Role" required options={ROLE_OPTIONS} />

      {role === "LIE" && (
        <RHFText control={control} name="assignedLga" label="Assigned LGA" required placeholder="e.g. Ibadan North" />
      )}
      {role === "ZONAL_COORD" && (
        <RHFText control={control} name="assignedZone" label="Assigned zone" placeholder="e.g. Ibadan Zone" />
      )}
      {role === "INSPECT_OFFICER" && (
        <RHFText control={control} name="assignedCluster" label="Assigned cluster" placeholder="School cluster" />
      )}
      {role === "PRINCIPAL" && (
        <RHFSelect
          control={control}
          name="assignedSchoolId"
          label="Assigned school"
          required
          placeholder="Select a school…"
          options={schools.map((s) => ({
            value: s.id,
            label: `${s.name} (${s.code}) · ${s.lgaName}`,
          }))}
        />
      )}
    </>
  );
}
