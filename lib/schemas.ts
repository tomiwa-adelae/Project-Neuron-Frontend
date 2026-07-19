import * as z from "zod";

// Client-side Zod schemas that MIRROR the backend class-validator DTOs, so invalid
// input is caught inline (shadcn FormMessage) before any request is sent. Keep these
// in lockstep with backend/src/**/dto/*.ts. Option sets come from lib/api.ts (the
// single source shared with the API).

// ─── small helpers ────────────────────────────────────────────────────────────
const req = (msg: string) => z.string().min(1, msg);
const str = (max: number) =>
  z.string().max(max, `Must be ${max} characters or fewer`).optional();
const intIn = (min: number, max: number) =>
  z
    .number({ error: "Enter a whole number" })
    .int("Enter a whole number")
    .min(min, `Must be ${min} or more`)
    .max(max, `Must be ${max} or less`);
const numIn = (min: number, max: number) =>
  z
    .number({ error: "Enter a number" })
    .min(min, `Must be ${min} or more`)
    .max(max, `Must be ${max} or less`);

// ─── Annual School Census (AscRecordDto) ──────────────────────────────────────
export const AscSchema = z
  .object({
    classLevel: req("Select a class level"),
    gender: req("Select a gender"),
    enrolmentCount: intIn(0, 100000),
    newEntrants: intIn(0, 100000),
    repeaters: intIn(0, 100000),
    dropoutCount: intIn(0, 100000),
  })
  .superRefine((d, ctx) => {
    if (d.newEntrants > d.enrolmentCount) {
      ctx.addIssue({
        code: "custom",
        path: ["newEntrants"],
        message: "New entrants cannot exceed the enrolment count.",
      });
    }
  });
export type AscSchemaType = z.infer<typeof AscSchema>;

// ─── Student register (StudentRecordDto) ──────────────────────────────────────
export const StudentSchema = z.object({
  studentCode: req("Student code is required").max(60, "Must be 60 characters or fewer"),
  classLevel: req("Select a class level"),
  firstName: req("First name is required").max(80, "Must be 80 characters or fewer"),
  middleName: str(80),
  lastName: req("Last name is required").max(80, "Must be 80 characters or fewer"),
  dateOfBirth: z.string().optional(),
  gender: req("Select a gender"),
  stateOfOrigin: z.string().optional(),
  lgaOfOrigin: str(80),
  disabilityStatus: z.boolean().optional(),
  disabilityType: str(120),
  enrolmentType: req("Select an enrolment type"),
  distanceToSchoolKm: numIn(0, 500).optional(),
  transportMode: z.string().optional(),
  guardianName: str(120),
  guardianPhone: str(40),
  enrolmentDate: req("Enrolment date is required"),
  exitDate: z.string().optional(),
  exitReason: z.string().optional(),
});
export type StudentSchemaType = z.infer<typeof StudentSchema>;

// ─── Staff register (StaffRecordDto) ──────────────────────────────────────────
export const StaffSchema = z.object({
  staffCode: req("Staff code is required").max(60, "Must be 60 characters or fewer"),
  firstName: req("First name is required").max(80, "Must be 80 characters or fewer"),
  middleName: str(80),
  lastName: req("Last name is required").max(80, "Must be 80 characters or fewer"),
  gender: req("Select a gender"),
  dateOfBirth: z.string().optional(),
  phoneNumber: z
    .string()
    .max(40, "Phone number must be 40 characters or fewer")
    .optional(),
  staffType: req("Select a staff type"),
  employmentType: req("Select an employment type"),
  qualification: req("Select a qualification"),
  subject: str(80),
  dateOfFirstAppointment: z.string().optional(),
  datePostedToSchool: z.string().optional(),
  isResidentInCommunity: z.boolean(),
  yearsAtCurrentSchool: intIn(0, 80).optional(),
  isHeadTeacher: z.boolean(),
});
export type StaffSchemaType = z.infer<typeof StaffSchema>;

// ─── Security & vulnerability (SecurityAssessmentDto) ──────────────────────────
// Draft: everything optional (partial save allowed); only ranges are enforced.
export const SecurityDraftSchema = z.object({
  distanceToMajorRoadKm: numIn(0, 500).optional(),
  roadSurfaceType: z.string().optional(),
  estimatedTravelTimeMins: intIn(0, 1440).optional(),
  nearestTown: str(120),
  forestProximity: z.string().optional(),
  forestDistanceEstimateKm: numIn(0, 500).optional(),

  perimeterFenceStatus: z.string().optional(),
  fenceType: z.string().optional(),
  numberOfEntryPoints: intIn(0, 100).optional(),
  hasFunctionalGate: z.boolean().optional(),
  hasCctv: z.boolean().optional(),
  hasElectricity: z.boolean().optional(),
  hasSolar: z.boolean().optional(),
  hasExternalLighting: z.boolean().optional(),

  hasPhoneNetwork: z.boolean().optional(),
  networkProvider: z.string().optional(),
  signalStrength: z.string().optional(),
  hasLandline: z.boolean().optional(),
  hasRadioSet: z.boolean().optional(),
  hasEmergencyProtocol: z.boolean().optional(),
  distanceToSecurityPostKm: numIn(0, 500).optional(),
  nearestSecurityPostName: str(120),

  hadSecurityIncident: z.boolean().optional(),
  incidentCount: intIn(0, 1000).optional(),
  mostRecentIncidentYear: intIn(1980, 2100).optional(),
  mostRecentIncidentType: z.string().optional(),
  incidentReportedToAuth: z.boolean().optional(),
});
export type SecuritySchemaType = z.infer<typeof SecurityDraftSchema>;

// Submit: the required core from SchoolsService.REQUIRED_FOR_SUBMIT. The boolean
// members of that list (hasFunctionalGate/hasCctv/hasElectricity/hasExternalLighting/
// hasPhoneNetwork/hasEmergencyProtocol/hadSecurityIncident) are captured with a
// Switch, so they always carry a definite true/false the backend accepts — only the
// non-boolean required fields need a client "please fill this" check. Conditional
// incident fields apply when an incident is reported.
const REQUIRED_ON_SUBMIT: [keyof SecuritySchemaType, string][] = [
  ["roadSurfaceType", "Road surface is required"],
  ["forestProximity", "Forest proximity is required"],
  ["perimeterFenceStatus", "Perimeter fence status is required"],
  ["numberOfEntryPoints", "Number of entry points is required"],
  ["signalStrength", "Signal strength is required"],
];

export const SecuritySubmitSchema = SecurityDraftSchema.superRefine((d, ctx) => {
  for (const [key, message] of REQUIRED_ON_SUBMIT) {
    const v = d[key];
    if (v === undefined || v === null || v === "") {
      ctx.addIssue({ code: "custom", path: [key], message });
    }
  }
  if (d.hadSecurityIncident === true) {
    const conditional: [keyof SecuritySchemaType, string][] = [
      ["incidentCount", "Incident count is required"],
      ["mostRecentIncidentYear", "Most recent incident year is required"],
      ["mostRecentIncidentType", "Most recent incident type is required"],
    ];
    for (const [key, message] of conditional) {
      const v = d[key];
      if (v === undefined || v === null || v === "") {
        ctx.addIssue({ code: "custom", path: [key], message });
      }
    }
  }
});

// ─── Media (MediaUploadDto / MediaMetaDto) ────────────────────────────────────
export const MediaMetaSchema = z.object({
  category: req("Select a category"),
  caption: req("A caption is required").max(500, "Must be 500 characters or fewer"),
  isPrimary: z.boolean().optional(),
});
export type MediaMetaSchemaType = z.infer<typeof MediaMetaSchema>;

// ─── Admin: school registry (CreateSchoolDto / UpdateSchoolDto) ────────────────
export const SchoolSchema = z.object({
  code: req("Code is required").max(40, "Must be 40 characters or fewer"),
  name: req("Name is required").max(200, "Must be 200 characters or fewer"),
  type: req("Select a type"),
  ownership: req("Select ownership"),
  category: req("Select a category"),
  genderCategory: req("Select a gender category"),
  lgaName: req("LGA is required").max(120, "Must be 120 characters or fewer"),
  lgaCode: str(40),
  zoneName: str(120),
  cluster: str(120),
  ward: str(120),
  community: str(120),
  address: str(300),
  latitude: numIn(-90, 90).optional(),
  longitude: numIn(-180, 180).optional(),
  dateEstablished: z
    .number()
    .int("Enter a 4-digit year")
    .min(1800, "Enter a valid year")
    .max(2100, "Enter a valid year")
    .optional(),
});
export type SchoolSchemaType = z.infer<typeof SchoolSchema>;

// ─── Admin: sessions & periods ────────────────────────────────────────────────
export const SessionSchema = z.object({
  name: req("Session name is required").max(40, "Must be 40 characters or fewer"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().optional(),
});
export type SessionSchemaType = z.infer<typeof SessionSchema>;

export const PeriodSchema = z.object({
  name: req("Period name is required").max(60, "Must be 60 characters or fewer"),
  sequence: z.number().int("Enter a whole number").min(1, "Must be 1 or more").optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
export type PeriodSchemaType = z.infer<typeof PeriodSchema>;

// ─── Admin: user role + scope (ProvisionUserDto / ApproveUserDto / UpdateUserDto)
// The role dictates which scope field is required.
const ScopeShape = {
  role: req("Select a role"),
  assignedLga: str(120),
  assignedZone: str(120),
  assignedCluster: str(120),
  assignedSchoolId: str(64),
};

const scopeRefine = (d: {
  role: string;
  assignedLga?: string;
  assignedZone?: string;
  assignedCluster?: string;
  assignedSchoolId?: string;
}, ctx: z.RefinementCtx) => {
  if (d.role === "LIE" && !d.assignedLga?.trim()) {
    ctx.addIssue({ code: "custom", path: ["assignedLga"], message: "Assign an LGA for a field inspector." });
  }
  if (d.role === "PRINCIPAL" && !d.assignedSchoolId?.trim()) {
    ctx.addIssue({ code: "custom", path: ["assignedSchoolId"], message: "Assign a school for a principal." });
  }
};

export const ScopeSchema = z.object(ScopeShape).superRefine(scopeRefine);
export type ScopeSchemaType = z.infer<typeof ScopeSchema>;

// Provision adds the person's identity fields.
export const ProvisionUserSchema = z
  .object({
    firstName: req("First name is required").max(80, "Must be 80 characters or fewer"),
    lastName: req("Last name is required").max(80, "Must be 80 characters or fewer"),
    email: req("Email is required").email("Enter a valid email address"),
    phoneNumber: req("Phone number is required").max(40, "Must be 40 characters or fewer"),
    ...ScopeShape,
  })
  .superRefine(scopeRefine);
export type ProvisionUserSchemaType = z.infer<typeof ProvisionUserSchema>;

export const RejectSchema = z.object({
  reason: z.string().max(300, "Must be 300 characters or fewer").optional(),
});
export type RejectSchemaType = z.infer<typeof RejectSchema>;
