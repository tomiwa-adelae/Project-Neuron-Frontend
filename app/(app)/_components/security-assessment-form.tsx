"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, Send } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
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
import {
  SecurityDraftSchema,
  SecuritySubmitSchema,
  type SecuritySchemaType,
} from "@/lib/schemas";
import { queueSecurity } from "@/lib/offline/queue";
import {
  RHFText,
  RHFNumber,
  RHFSelect,
  RHFSwitch,
} from "./rhf-fields";

// Build RHF defaults from the saved profile. Only the editable assessment fields
// are read; identifiers/scores/timestamps on the row are ignored. Booleans default
// to a definite false (Switch semantics).
function toDefaults(p: SecurityProfile | null): SecuritySchemaType {
  return {
    distanceToMajorRoadKm: p?.distanceToMajorRoadKm ?? undefined,
    roadSurfaceType: p?.roadSurfaceType ?? "",
    estimatedTravelTimeMins: p?.estimatedTravelTimeMins ?? undefined,
    nearestTown: p?.nearestTown ?? "",
    forestProximity: p?.forestProximity ?? "",
    forestDistanceEstimateKm: p?.forestDistanceEstimateKm ?? undefined,
    perimeterFenceStatus: p?.perimeterFenceStatus ?? "",
    fenceType: p?.fenceType ?? "",
    numberOfEntryPoints: p?.numberOfEntryPoints ?? undefined,
    hasFunctionalGate: p?.hasFunctionalGate ?? false,
    hasCctv: p?.hasCctv ?? false,
    hasElectricity: p?.hasElectricity ?? false,
    hasSolar: p?.hasSolar ?? false,
    hasExternalLighting: p?.hasExternalLighting ?? false,
    hasPhoneNetwork: p?.hasPhoneNetwork ?? false,
    networkProvider: p?.networkProvider ?? "",
    signalStrength: p?.signalStrength ?? "",
    hasLandline: p?.hasLandline ?? false,
    hasRadioSet: p?.hasRadioSet ?? false,
    hasEmergencyProtocol: p?.hasEmergencyProtocol ?? false,
    distanceToSecurityPostKm: p?.distanceToSecurityPostKm ?? undefined,
    nearestSecurityPostName: p?.nearestSecurityPostName ?? "",
    hadSecurityIncident: p?.hadSecurityIncident ?? false,
    incidentCount: p?.incidentCount ?? undefined,
    mostRecentIncidentYear: p?.mostRecentIncidentYear ?? undefined,
    mostRecentIncidentType: p?.mostRecentIncidentType ?? "",
    incidentReportedToAuth: p?.incidentReportedToAuth ?? false,
  };
}

export function SecurityAssessmentForm({
  schoolId,
  initial,
}: {
  schoolId: string;
  initial: SecurityProfile | null;
}) {
  const router = useRouter();
  const form = useForm<SecuritySchemaType>({
    // Draft resolver enforces the numeric ranges inline at all times; the stricter
    // required-core check runs only on Submit.
    resolver: zodResolver(SecurityDraftSchema),
    defaultValues: toDefaults(initial),
  });
  const { control } = form;
  const submitting = form.formState.isSubmitting;
  const hadIncident = form.watch("hadSecurityIncident");

  const persist = async (values: SecuritySchemaType, mode: "draft" | "submit") => {
    const payload = values as unknown as SecurityAssessmentInput;
    try {
      if (mode === "submit") {
        const res = await submitSecurityAssessment(schoolId, payload);
        const tier = res.security?.riskTier;
        toast.success(`Assessment submitted${tier ? ` · Risk tier: ${tier}` : ""}.`);
        router.push(`/schools/${schoolId}`);
      } else {
        await saveSecurityAssessment(schoolId, payload);
        toast.success("Draft saved.");
        router.refresh();
      }
    } catch (err) {
      // Offline: queue and let background sync flush later.
      if (err instanceof ApiError && err.status === 0) {
        await queueSecurity(
          mode === "submit" ? "security-submit" : "security-draft",
          schoolId,
          payload,
        );
        toast.success(
          mode === "submit"
            ? "Saved offline — will submit when you reconnect."
            : "Saved offline — will sync when you reconnect.",
        );
        if (mode === "submit") router.push(`/schools/${schoolId}`);
        return;
      }
      toast.error(
        err instanceof ApiError
          ? err.message
          : `Couldn't ${mode === "submit" ? "submit the assessment" : "save the draft"}.`,
      );
    }
  };

  const onSaveDraft = form.handleSubmit((v) => persist(v, "draft"));

  // Submit: draft resolver validates ranges first, then apply the stricter
  // required-core schema and surface any misses inline before sending.
  const onSubmit = form.handleSubmit((v) => {
    const strict = SecuritySubmitSchema.safeParse(v);
    if (!strict.success) {
      for (const issue of strict.error.issues) {
        form.setError(issue.path.join(".") as keyof SecuritySchemaType, {
          message: issue.message,
        });
      }
      toast.error("Please complete the highlighted fields before submitting.");
      return;
    }
    return persist(v, "submit");
  });

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={onSubmit}>
        <Section
          title="Module A — Location & Access"
          hint="How isolated is the school and how hard is it to reach?"
        >
          <RHFNumber control={control} name="distanceToMajorRoadKm" label="Distance to nearest major/paved road" unit="km" min={0} />
          <RHFSelect control={control} name="roadSurfaceType" label="Road surface leading to the school" options={ROAD_SURFACE_TYPES} />
          <RHFNumber control={control} name="estimatedTravelTimeMins" label="Travel time to LGA headquarters" unit="mins" min={0} />
          <RHFText control={control} name="nearestTown" label="Nearest town or settlement" />
          <RHFSelect control={control} name="forestProximity" label="Proximity of nearest forest / bush" options={FOREST_PROXIMITIES} />
          <RHFNumber control={control} name="forestDistanceEstimateKm" label="Distance to nearest forest boundary" unit="km" min={0} />
        </Section>

        <Section
          title="Module B — Physical Infrastructure & Perimeter"
          hint="Walk the full compound. Record what you physically observe."
        >
          <RHFSelect control={control} name="perimeterFenceStatus" label="Perimeter fence" options={FENCE_STATUSES} />
          <RHFSelect control={control} name="fenceType" label="Fence material" options={FENCE_TYPES} />
          <RHFNumber control={control} name="numberOfEntryPoints" label="Number of entry points / openings" min={0} />
          <RHFSwitch control={control} name="hasFunctionalGate" label="Lockable functional gate at main entrance?" />
          <RHFSwitch control={control} name="hasCctv" label="Functional CCTV / surveillance?" />
          <RHFSwitch control={control} name="hasElectricity" label="Grid electricity connection?" />
          <RHFSwitch control={control} name="hasSolar" label="Solar power installation?" />
          <RHFSwitch control={control} name="hasExternalLighting" label="External / security lighting at night?" />
        </Section>

        <Section
          title="Module C — Communication & Emergency Capacity"
          hint="Can the school call for help, and how fast can help arrive?"
        >
          <RHFSwitch control={control} name="hasPhoneNetwork" label="Mobile phone network signal available?" />
          <RHFSelect control={control} name="networkProvider" label="Strongest network provider" options={NETWORK_PROVIDERS} />
          <RHFSelect control={control} name="signalStrength" label="Signal strength" options={SIGNAL_STRENGTHS} />
          <RHFSwitch control={control} name="hasLandline" label="Functioning fixed telephone line?" />
          <RHFSwitch control={control} name="hasRadioSet" label="Functioning two-way radio set?" />
          <RHFSwitch control={control} name="hasEmergencyProtocol" label="Documented emergency response plan?" />
          <RHFNumber control={control} name="distanceToSecurityPostKm" label="Distance to nearest Amotekun / police post" unit="km" min={0} />
          <RHFText control={control} name="nearestSecurityPostName" label="Nearest security post name" />
        </Section>

        <Section
          title="Module D — Incident History"
          hint="Ask the school head privately. Used for protective resource allocation, not penalties."
        >
          <RHFSwitch control={control} name="hadSecurityIncident" label="Any security incident in the past 5 years?" />
          {hadIncident === true && (
            <>
              <RHFNumber control={control} name="incidentCount" label="How many incidents in the past 5 years?" min={0} />
              <RHFNumber control={control} name="mostRecentIncidentYear" label="Year of most recent incident" />
              <RHFSelect control={control} name="mostRecentIncidentType" label="Type of most recent incident" options={INCIDENT_TYPES} />
              <RHFSwitch control={control} name="incidentReportedToAuth" label="Was it reported to the authorities?" />
            </>
          )}
        </Section>

        <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 border-t border-neutral-200 bg-white/90 py-4 backdrop-blur">
          <Button type="button" variant="outline" onClick={onSaveDraft} disabled={submitting} className="h-11">
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Save draft
          </Button>
          <Button type="submit" disabled={submitting} className="h-11 bg-[#0b6b3a] text-white hover:bg-[#095a31]">
            {submitting ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Submit assessment
          </Button>
        </div>
      </form>
    </Form>
  );
}

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
      <h3 className="font-heading text-base font-semibold text-neutral-900">{title}</h3>
      <p className="mt-0.5 text-xs text-neutral-500">{hint}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
