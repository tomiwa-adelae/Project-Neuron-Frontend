"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  saveSecurityAssessment,
  submitSecurityAssessment,
  ApiError,
  ROAD_SURFACE_TYPES,
  FOREST_PROXIMITIES,
  FENCE_STATUSES,
  FENCE_TYPES,
  NETWORK_PROVIDERS,
  SIGNAL_STRENGTHS,
  INCIDENT_TYPES,
  type SecurityAssessmentInput,
  type SecurityProfile,
} from "@/lib/api";

const FIELD =
  "h-10 rounded-md border-neutral-200 bg-neutral-50 text-sm text-neutral-900 focus-visible:border-[#0b6b3a] focus-visible:ring-2 focus-visible:ring-[#0b6b3a]/20";

// Pull only the editable capture fields out of the saved profile.
function toForm(p: SecurityProfile | null): SecurityAssessmentInput {
  if (!p) return {};
  const {
    id: _id,
    recordStatus: _rs,
    submittedAt: _sa,
    isolationScore: _is,
    infrastructureScore: _if,
    communicationScore: _cs,
    compositeRiskScore: _crs,
    riskTier: _rt,
    ...rest
  } = p;
  return rest;
}

export function SecurityAssessmentForm({
  schoolId,
  initial,
}: {
  schoolId: string;
  initial: SecurityProfile | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<SecurityAssessmentInput>(toForm(initial));
  const [savingDraft, startSaving] = useTransition();
  const [submitting, startSubmitting] = useTransition();
  const busy = savingDraft || submitting;

  const set = (patch: Partial<SecurityAssessmentInput>) =>
    setForm((f) => ({ ...f, ...patch }));

  const onSaveDraft = () => {
    startSaving(async () => {
      try {
        await saveSecurityAssessment(schoolId, form);
        toast.success("Draft saved.");
        router.refresh();
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't save the draft.",
        );
      }
    });
  };

  const onSubmit = () => {
    startSubmitting(async () => {
      try {
        const res = await submitSecurityAssessment(schoolId, form);
        const tier = res.security?.riskTier;
        toast.success(
          `Assessment submitted${tier ? ` · Risk tier: ${tier}` : ""}.`,
        );
        router.push(`/schools/${schoolId}`);
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Couldn't submit the assessment.",
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Module A */}
      <Section
        title="Module A — Location & Access"
        hint="How isolated is the school and how hard is it to reach?"
      >
        <NumberField
          label="Distance to nearest major/paved road"
          unit="km"
          value={form.distanceToMajorRoadKm}
          onChange={(v) => set({ distanceToMajorRoadKm: v })}
        />
        <SelectField
          label="Road surface leading to the school"
          options={ROAD_SURFACE_TYPES}
          value={form.roadSurfaceType}
          onChange={(v) => set({ roadSurfaceType: v })}
        />
        <NumberField
          label="Travel time to LGA headquarters"
          unit="mins"
          value={form.estimatedTravelTimeMins}
          onChange={(v) => set({ estimatedTravelTimeMins: v })}
        />
        <TextField
          label="Nearest town or settlement"
          value={form.nearestTown}
          onChange={(v) => set({ nearestTown: v })}
        />
        <SelectField
          label="Proximity of nearest forest / bush"
          options={FOREST_PROXIMITIES}
          value={form.forestProximity}
          onChange={(v) => set({ forestProximity: v })}
        />
        <NumberField
          label="Distance to nearest forest boundary"
          unit="km"
          value={form.forestDistanceEstimateKm}
          onChange={(v) => set({ forestDistanceEstimateKm: v })}
        />
      </Section>

      {/* Module B */}
      <Section
        title="Module B — Physical Infrastructure & Perimeter"
        hint="Walk the full compound. Record what you physically observe."
      >
        <SelectField
          label="Perimeter fence"
          options={FENCE_STATUSES}
          value={form.perimeterFenceStatus}
          onChange={(v) => set({ perimeterFenceStatus: v })}
        />
        <SelectField
          label="Fence material"
          options={FENCE_TYPES}
          value={form.fenceType}
          onChange={(v) => set({ fenceType: v })}
        />
        <NumberField
          label="Number of entry points / openings"
          value={form.numberOfEntryPoints}
          onChange={(v) => set({ numberOfEntryPoints: v })}
        />
        <Toggle
          label="Lockable functional gate at main entrance?"
          value={form.hasFunctionalGate}
          onChange={(v) => set({ hasFunctionalGate: v })}
        />
        <Toggle
          label="Functional CCTV / surveillance?"
          value={form.hasCctv}
          onChange={(v) => set({ hasCctv: v })}
        />
        <Toggle
          label="Grid electricity connection?"
          value={form.hasElectricity}
          onChange={(v) => set({ hasElectricity: v })}
        />
        <Toggle
          label="Solar power installation?"
          value={form.hasSolar}
          onChange={(v) => set({ hasSolar: v })}
        />
        <Toggle
          label="External / security lighting at night?"
          value={form.hasExternalLighting}
          onChange={(v) => set({ hasExternalLighting: v })}
        />
      </Section>

      {/* Module C */}
      <Section
        title="Module C — Communication & Emergency Capacity"
        hint="Can the school call for help, and how fast can help arrive?"
      >
        <Toggle
          label="Mobile phone network signal available?"
          value={form.hasPhoneNetwork}
          onChange={(v) => set({ hasPhoneNetwork: v })}
        />
        <SelectField
          label="Strongest network provider"
          options={NETWORK_PROVIDERS}
          value={form.networkProvider}
          onChange={(v) => set({ networkProvider: v })}
        />
        <SelectField
          label="Signal strength"
          options={SIGNAL_STRENGTHS}
          value={form.signalStrength}
          onChange={(v) => set({ signalStrength: v })}
        />
        <Toggle
          label="Functioning fixed telephone line?"
          value={form.hasLandline}
          onChange={(v) => set({ hasLandline: v })}
        />
        <Toggle
          label="Functioning two-way radio set?"
          value={form.hasRadioSet}
          onChange={(v) => set({ hasRadioSet: v })}
        />
        <Toggle
          label="Documented emergency response plan?"
          value={form.hasEmergencyProtocol}
          onChange={(v) => set({ hasEmergencyProtocol: v })}
        />
        <NumberField
          label="Distance to nearest Amotekun / police post"
          unit="km"
          value={form.distanceToSecurityPostKm}
          onChange={(v) => set({ distanceToSecurityPostKm: v })}
        />
        <TextField
          label="Nearest security post name"
          value={form.nearestSecurityPostName}
          onChange={(v) => set({ nearestSecurityPostName: v })}
        />
      </Section>

      {/* Module D */}
      <Section
        title="Module D — Incident History"
        hint="Ask the school head privately. Used for protective resource allocation, not penalties."
      >
        <Toggle
          label="Any security incident in the past 5 years?"
          value={form.hadSecurityIncident}
          onChange={(v) =>
            set(
              v
                ? { hadSecurityIncident: true }
                : {
                    hadSecurityIncident: false,
                    incidentCount: null,
                    mostRecentIncidentYear: null,
                    mostRecentIncidentType: null,
                    incidentReportedToAuth: null,
                  },
            )
          }
        />
        {form.hadSecurityIncident === true && (
          <>
            <NumberField
              label="How many incidents in the past 5 years?"
              value={form.incidentCount}
              onChange={(v) => set({ incidentCount: v })}
            />
            <NumberField
              label="Year of most recent incident"
              value={form.mostRecentIncidentYear}
              onChange={(v) => set({ mostRecentIncidentYear: v })}
            />
            <SelectField
              label="Type of most recent incident"
              options={INCIDENT_TYPES}
              value={form.mostRecentIncidentType}
              onChange={(v) => set({ mostRecentIncidentType: v })}
            />
            <Toggle
              label="Was it reported to the authorities?"
              value={form.incidentReportedToAuth}
              onChange={(v) => set({ incidentReportedToAuth: v })}
            />
          </>
        )}
      </Section>

      {/* Actions */}
      <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-neutral-200 bg-white/90 py-4 backdrop-blur">
        <Button
          variant="outline"
          onClick={onSaveDraft}
          disabled={busy}
          className="h-11"
        >
          {savingDraft ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Save draft
        </Button>
        <Button
          onClick={onSubmit}
          disabled={busy}
          className="h-11 bg-[#0b6b3a] text-white hover:bg-[#095a31]"
        >
          {submitting ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Submit assessment
        </Button>
      </div>
    </div>
  );
}

// ─── Field controls ───────────────────────────────────────────────────────────

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <h3 className="font-heading text-base font-semibold text-neutral-900">
        {title}
      </h3>
      <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-sm font-medium text-neutral-700">{children}</label>
  );
}

function NumberField({
  label,
  unit,
  value,
  onChange,
}: {
  label: string;
  unit?: string;
  value?: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <Input
          type="number"
          inputMode="decimal"
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

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        className={FIELD}
      />
    </div>
  );
}

function SelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value?: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="space-y-1.5">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
        className={cn(FIELD, "w-full px-3")}
      >
        <option value="">Select…</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function Toggle({
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
