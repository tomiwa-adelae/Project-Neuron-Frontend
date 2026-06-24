"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const FIELD =
  "h-10 rounded-md border-neutral-200 bg-neutral-50 text-sm text-neutral-900 focus-visible:border-[#0b6b3a] focus-visible:ring-2 focus-visible:ring-[#0b6b3a]/20";

export function FieldLabel({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-sm font-medium text-neutral-700">
      {children}
      {required && <span className="ml-0.5 text-red-500">*</span>}
    </label>
  );
}

export function TextField({
  label,
  required,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  required?: boolean;
  value?: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <Input
        type={type}
        value={value ?? ""}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        className={FIELD}
      />
    </div>
  );
}

export function NumberField({
  label,
  required,
  unit,
  value,
  onChange,
  min,
}: {
  label: string;
  required?: boolean;
  unit?: string;
  value?: number | null;
  onChange: (v: number | null) => void;
  min?: number;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
          min={min}
          value={value ?? ""}
          onChange={(e) =>
            onChange(e.target.value === "" ? null : Number(e.target.value))
          }
          className={cn(FIELD, unit && "pr-12")}
        />
        {unit && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export function DateField({
  label,
  required,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  value?: string | null;
  onChange: (v: string | null) => void;
}) {
  // value/onChange use ISO "yyyy-mm-dd" (what <input type=date> expects).
  return (
    <div className="space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <Input
        type="date"
        value={value ? value.slice(0, 10) : ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        className={FIELD}
      />
    </div>
  );
}

export function SelectField({
  label,
  required,
  options,
  value,
  onChange,
  placeholder = "Select…",
}: {
  label: string;
  required?: boolean;
  options: readonly string[];
  value?: string | null;
  onChange: (v: string | null) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel required={required}>{label}</FieldLabel>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        className={cn(FIELD, "w-full px-3")}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

export function ToggleField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
      <span className="text-sm text-neutral-700">{label}</span>
      <div className="flex shrink-0 overflow-hidden rounded-md border border-neutral-200">
        {[
          [true, "Yes"],
          [false, "No"],
        ].map(([v, lbl]) => (
          <button
            key={String(v)}
            type="button"
            onClick={() => onChange(v as boolean)}
            className={cn(
              "px-3 py-1 text-xs font-medium transition-colors",
              value === v
                ? v
                  ? "bg-[#0b6b3a] text-white"
                  : "bg-neutral-700 text-white"
                : "bg-white text-neutral-600 hover:bg-neutral-100",
            )}
          >
            {lbl as string}
          </button>
        ))}
      </div>
    </div>
  );
}

// Gender as a compact segmented control (the only two-option enum reused widely).
export function GenderField({
  value,
  onChange,
  required,
}: {
  value?: "MALE" | "FEMALE" | null;
  onChange: (v: "MALE" | "FEMALE") => void;
  required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel required={required}>Gender</FieldLabel>
      <div className="flex overflow-hidden rounded-md border border-neutral-200">
        {(["MALE", "FEMALE"] as const).map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => onChange(g)}
            className={cn(
              "flex-1 px-3 py-2 text-sm font-medium transition-colors",
              value === g
                ? "bg-[#0b6b3a] text-white"
                : "bg-neutral-50 text-neutral-600 hover:bg-neutral-100",
            )}
          >
            {g === "MALE" ? "Male" : "Female"}
          </button>
        ))}
      </div>
    </div>
  );
}
