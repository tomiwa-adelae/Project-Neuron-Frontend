// Base URL of the NestJS API. The backend mounts everything under the `/api`
// global prefix and runs on port 8000 by default.
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// ─── Silent token refresh ─────────────────────────────────────────────────────
//
// The short-lived access token lives in an httpOnly cookie; when it expires the
// API returns 401. We transparently POST /auth/refresh once (the refresh cookie
// is longer-lived) and retry the original request. Concurrent 401s share a
// single in-flight refresh so we never fire a burst of refresh calls. If refresh
// fails, the original 401 surfaces and the caller bounces to /login.
let refreshInFlight: Promise<boolean> | null = null;

// Paths where a 401 is expected/meaningful and must NOT trigger a refresh:
// unauthenticated flows, and /auth/refresh itself (to avoid an infinite loop).
const NO_REFRESH_PATHS = [
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/verify-otp",
  "/auth/reset-password",
];

function canRefresh(path: string): boolean {
  return !NO_REFRESH_PATHS.some((p) => path.startsWith(p));
}

async function doRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    return res.ok;
  } catch {
    return false;
  }
}

function refreshSession(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = doRefresh().finally(() => {
      refreshInFlight = null;
    });
  }
  return refreshInFlight;
}

/**
 * Thin fetch wrapper. `credentials: "include"` is required so the browser sends
 * and stores the httpOnly auth cookies the API sets (RBAC Rule 7 — the JWT lives
 * in a cookie, never in localStorage).
 */
export async function apiFetch<T = unknown>(
  path: string,
  init?: RequestInit,
  retryOn401 = true,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    // Network/offline failure — the field portal runs on flaky 3G.
    throw new ApiError(
      "Can't reach the server. Check your connection and try again.",
      0,
    );
  }

  // Access token expired: refresh once and replay the original request.
  if (res.status === 401 && retryOn401 && canRefresh(path)) {
    if (await refreshSession()) {
      return apiFetch<T>(path, init, false);
    }
  }

  const isJson = res.headers
    .get("content-type")
    ?.includes("application/json");
  const body = isJson ? await res.json() : null;

  if (!res.ok) {
    const raw = body && (body.message ?? body.error);
    const message = Array.isArray(raw)
      ? raw.join(", ")
      : raw || `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }

  return body as T;
}

// ─── Auth ───────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  accountStatus: string;
  assignedLga: string | null;
  assignedZone: string | null;
  assignedCluster: string | null;
  assignedSchoolId: string | null;
}

export interface LoginResponse {
  message: string;
  // Returned when the user must change a temporary password before proceeding.
  requiresPasswordChange?: boolean;
  email?: string;
  user?: AuthUser;
}

export function login(input: {
  email: string;
  password: string;
  rememberMe: boolean;
}): Promise<LoginResponse> {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  password: string;
  confirmPassword: string;
  // Self-service principal path: set role and the school being requested. The
  // admin confirms the binding on approval. Omit both for a default LIE signup.
  role?: "PRINCIPAL";
  requestedSchoolId?: string;
}

// PII-free school directory for the self-registration picker (unauthenticated).
export interface PublicSchool {
  id: string;
  name: string;
  code: string;
  lgaName: string;
}

export function getPublicSchools(): Promise<{ schools: PublicSchool[] }> {
  return apiFetch<{ schools: PublicSchool[] }>("/public/schools");
}

export interface RegisterResponse {
  message: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    username: string;
    email: string;
    role: string;
    accountStatus: string;
    createdAt: string;
  };
}

// Self-registration creates a PENDING LIE awaiting SYS_ADMIN activation
// (RBAC Rule 6) — no token is issued and the account cannot sign in yet.
export function register(input: RegisterInput): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ─── Forgot password (3-step OTP flow) ───────────────────────────────────────

export interface MessageResponse {
  message: string;
}

// Step 1 — request a reset OTP. The API always responds with the same generic
// message regardless of whether the email exists (no account enumeration).
export function forgotPassword(email: string): Promise<MessageResponse> {
  return apiFetch<MessageResponse>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

// Step 2 — confirm the 6-digit code is valid before showing the reset fields.
export function verifyOtp(input: {
  email: string;
  otp: string;
}): Promise<MessageResponse> {
  return apiFetch<MessageResponse>("/auth/verify-otp", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// Step 3 — set the new password (OTP is re-checked server-side).
export function resetPassword(input: {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<MessageResponse> {
  return apiFetch<MessageResponse>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ─── Session / identity ───────────────────────────────────────────────────────

export interface MeResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phoneNumber: string;
  accountStatus: string;
  requiresPasswordChange: boolean;
  createdAt: string;
  role: string;
  assignedLga: string | null;
  assignedZone: string | null;
  assignedCluster: string | null;
  assignedSchoolId: string | null;
}

// Reads identity from the httpOnly cookie. Throws ApiError(401) when not signed
// in — the app shell uses that to bounce to /login.
export function getMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>("/auth/me");
}

export function logout(): Promise<MessageResponse> {
  return apiFetch<MessageResponse>("/auth/logout", { method: "POST" });
}

// ─── Module 1: field capture (LIE) ────────────────────────────────────────────

export type CaptureStatus =
  | "NOT_STARTED"
  | "DRAFT"
  | "SUBMITTED"
  | "VERIFIED";

export interface AcademicSession {
  id: string;
  name: string;
}

export interface SchoolWorklistItem {
  id: string;
  code: string;
  name: string;
  type: string;
  ownership: string;
  category: string;
  genderCategory: string;
  lgaName: string;
  ward: string | null;
  community: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  visitId: string | null;
  status: CaptureStatus;
  sections: {
    asc: CaptureStatus;
    students: CaptureStatus;
    staff: CaptureStatus;
    security: CaptureStatus;
    media: CaptureStatus;
  } | null;
}

export interface SchoolListResponse {
  session: AcademicSession | null;
  schools: SchoolWorklistItem[];
}

// The caller's scoped worklist (LIE → assigned LGA) with current-session status.
export function getSchools(): Promise<SchoolListResponse> {
  return apiFetch<SchoolListResponse>("/schools");
}

export interface LieDashboardSummary {
  session: AcademicSession | null;
  assignedLga: string | null;
  assignedCluster: string | null;
  counts: {
    total: number;
    notStarted: number;
    inProgress: number;
    submitted: number;
    verified: number;
  };
  completed: number;
  completionRate: number;
}

export function getLieDashboardSummary(): Promise<LieDashboardSummary> {
  return apiFetch<LieDashboardSummary>("/dashboard/lie/summary");
}

// ─── School detail + security assessment ──────────────────────────────────────

// Option sets mirror the backend DTO (Field Capture Guide §5) — one source of
// truth for the form dropdowns.
export const ROAD_SURFACE_TYPES = [
  "Tarmac",
  "Laterite",
  "Gravel",
  "Footpath Only",
  "None",
] as const;
export const FOREST_PROXIMITIES = [
  "Adjacent",
  "Near",
  "Moderate",
  "Distant",
] as const;
export const FENCE_STATUSES = ["None", "Partial", "Full"] as const;
export const FENCE_TYPES = [
  "Concrete Block",
  "Wire Mesh",
  "Wooden",
  "Mixed",
  "None",
] as const;
export const NETWORK_PROVIDERS = [
  "MTN",
  "Airtel",
  "Glo",
  "9mobile",
  "None",
  "Multiple",
] as const;
export const SIGNAL_STRENGTHS = ["Strong", "Weak", "None"] as const;
export const INCIDENT_TYPES = [
  "Threat",
  "Robbery",
  "Abduction",
  "Physical Attack",
  "Vandalism",
  "Other",
] as const;

export interface SchoolMaster {
  id: string;
  code: string;
  name: string;
  type: string;
  ownership: string;
  category: string;
  genderCategory: string;
  lgaName: string;
  lgaCode: string | null;
  zoneName: string | null;
  cluster: string | null;
  ward: string | null;
  community: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  isActive: boolean;
}

// All capture fields optional — a draft may be partial.
export interface SecurityAssessmentInput {
  distanceToMajorRoadKm?: number | null;
  roadSurfaceType?: string | null;
  estimatedTravelTimeMins?: number | null;
  nearestTown?: string | null;
  forestProximity?: string | null;
  forestDistanceEstimateKm?: number | null;
  perimeterFenceStatus?: string | null;
  fenceType?: string | null;
  numberOfEntryPoints?: number | null;
  hasFunctionalGate?: boolean | null;
  hasCctv?: boolean | null;
  hasElectricity?: boolean | null;
  hasSolar?: boolean | null;
  hasExternalLighting?: boolean | null;
  hasPhoneNetwork?: boolean | null;
  networkProvider?: string | null;
  signalStrength?: string | null;
  hasLandline?: boolean | null;
  hasRadioSet?: boolean | null;
  hasEmergencyProtocol?: boolean | null;
  distanceToSecurityPostKm?: number | null;
  nearestSecurityPostName?: string | null;
  hadSecurityIncident?: boolean | null;
  incidentCount?: number | null;
  mostRecentIncidentYear?: number | null;
  mostRecentIncidentType?: string | null;
  incidentReportedToAuth?: boolean | null;
}

export interface SecurityProfile extends SecurityAssessmentInput {
  id: string;
  recordStatus: CaptureStatus;
  submittedAt: string | null;
  isolationScore: number | null;
  infrastructureScore: number | null;
  communicationScore: number | null;
  compositeRiskScore: number | null;
  riskTier: "High" | "Moderate" | "Low" | null;
}

export interface SchoolDetail {
  school: SchoolMaster;
  session: AcademicSession | null;
  // The capture period this detail reflects, and whether it is read-only history.
  period: {
    id: string;
    name: string;
    isCurrent: boolean;
    closedAt: string | null;
  } | null;
  readOnly: boolean;
  visit: {
    id: string;
    sections: {
      asc: CaptureStatus;
      students: CaptureStatus;
      staff: CaptureStatus;
      security: CaptureStatus;
      media: CaptureStatus;
    };
    overallStatus: CaptureStatus;
  } | null;
  security: SecurityProfile | null;
}

export function getSchool(id: string): Promise<SchoolDetail> {
  return apiFetch<SchoolDetail>(`/schools/${id}`);
}

export function saveSecurityAssessment(
  id: string,
  input: SecurityAssessmentInput,
): Promise<SchoolDetail> {
  return apiFetch<SchoolDetail>(`/schools/${id}/security`, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function submitSecurityAssessment(
  id: string,
  input: SecurityAssessmentInput,
): Promise<SchoolDetail> {
  return apiFetch<SchoolDetail>(`/schools/${id}/security/submit`, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ─── Registers: ASC / Students / Staff ────────────────────────────────────────

export type Gender = "MALE" | "FEMALE";

export const CLASS_LEVELS = [
  "Pry1", "Pry2", "Pry3", "Pry4", "Pry5", "Pry6",
  "JSS1", "JSS2", "JSS3", "SSS1", "SSS2", "SSS3",
] as const;
export const ENROLMENT_TYPES = [
  "New", "Continuing", "Returning", "Transfer-In",
] as const;
export const TRANSPORT_MODES = [
  "Walking", "Bicycle", "Motorcycle", "Vehicle", "Public Transport",
] as const;
export const EXIT_REASONS = [
  "Dropout", "Transfer-Out", "Completed", "Deceased", "Unknown",
] as const;
export const STAFF_TYPES = ["Teaching", "Non-Teaching"] as const;
export const EMPLOYMENT_TYPES = ["Permanent", "Contract", "NYSC", "Volunteer"] as const;
export const QUALIFICATIONS = [
  "NCE", "OND", "HND", "BSc", "BEd", "PGDE", "MSc", "MEd", "PhD", "Other",
] as const;
export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
  "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT",
  "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi",
  "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo",
  "Plateau", "Rivers", "Sokoto", "Taraba", "Yobe", "Zamfara",
] as const;

export interface RegisterList<T> {
  session: AcademicSession | null;
  rows: T[];
  status: CaptureStatus;
}

// ── ASC ──
export interface AscRecord {
  id: string;
  classLevel: string;
  gender: Gender;
  enrolmentCount: number;
  newEntrants: number;
  repeaters: number;
  dropoutCount: number;
}
export type AscInput = Omit<AscRecord, "id">;

export const listAsc = (id: string) =>
  apiFetch<RegisterList<AscRecord>>(`/schools/${id}/asc`);
export const createAsc = (id: string, input: AscInput) =>
  apiFetch<AscRecord>(`/schools/${id}/asc`, { method: "POST", body: JSON.stringify(input) });
export const updateAsc = (id: string, rowId: string, input: AscInput) =>
  apiFetch<AscRecord>(`/schools/${id}/asc/${rowId}`, { method: "PUT", body: JSON.stringify(input) });
export const deleteAsc = (id: string, rowId: string) =>
  apiFetch<MessageResponse>(`/schools/${id}/asc/${rowId}`, { method: "DELETE" });
export const submitAsc = (id: string) =>
  apiFetch<MessageResponse>(`/schools/${id}/asc/submit`, { method: "POST" });

// ── Students ──
export interface StudentRecord {
  id: string;
  studentCode: string;
  classLevel: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string | null;
  gender: Gender;
  stateOfOrigin: string | null;
  lgaOfOrigin: string | null;
  disabilityStatus: boolean;
  disabilityType: string | null;
  enrolmentType: string;
  distanceToSchoolKm: number | null;
  transportMode: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  enrolmentDate: string | null;
  exitDate: string | null;
  exitReason: string | null;
}
export interface StudentInput {
  studentCode: string;
  classLevel: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  dateOfBirth?: string | null;
  gender: Gender;
  stateOfOrigin?: string | null;
  lgaOfOrigin?: string | null;
  disabilityStatus?: boolean;
  disabilityType?: string | null;
  enrolmentType: string;
  distanceToSchoolKm?: number | null;
  transportMode?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  enrolmentDate: string;
  exitDate?: string | null;
  exitReason?: string | null;
}

export const listStudents = (id: string) =>
  apiFetch<RegisterList<StudentRecord>>(`/schools/${id}/students`);
export const createStudent = (id: string, input: StudentInput) =>
  apiFetch<StudentRecord>(`/schools/${id}/students`, { method: "POST", body: JSON.stringify(input) });
export const updateStudent = (id: string, rowId: string, input: StudentInput) =>
  apiFetch<StudentRecord>(`/schools/${id}/students/${rowId}`, { method: "PUT", body: JSON.stringify(input) });
export const deleteStudent = (id: string, rowId: string) =>
  apiFetch<MessageResponse>(`/schools/${id}/students/${rowId}`, { method: "DELETE" });
export const submitStudents = (id: string) =>
  apiFetch<MessageResponse>(`/schools/${id}/students/submit`, { method: "POST" });

// ── Staff ──
export interface StaffRecord {
  id: string;
  staffCode: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  gender: Gender;
  dateOfBirth: string | null;
  phoneNumber: string | null;
  staffType: string;
  employmentType: string;
  qualification: string;
  subject: string | null;
  dateOfFirstAppointment: string | null;
  datePostedToSchool: string | null;
  isResidentInCommunity: boolean;
  yearsAtCurrentSchool: number | null;
  isHeadTeacher: boolean;
}
export interface StaffInput {
  staffCode: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender: Gender;
  dateOfBirth?: string | null;
  phoneNumber?: string | null;
  staffType: string;
  employmentType: string;
  qualification: string;
  subject?: string | null;
  dateOfFirstAppointment?: string | null;
  datePostedToSchool?: string | null;
  isResidentInCommunity: boolean;
  yearsAtCurrentSchool?: number | null;
  isHeadTeacher: boolean;
}

export const listStaff = (id: string) =>
  apiFetch<RegisterList<StaffRecord>>(`/schools/${id}/staff`);
export const createStaff = (id: string, input: StaffInput) =>
  apiFetch<StaffRecord>(`/schools/${id}/staff`, { method: "POST", body: JSON.stringify(input) });
export const updateStaff = (id: string, rowId: string, input: StaffInput) =>
  apiFetch<StaffRecord>(`/schools/${id}/staff/${rowId}`, { method: "PUT", body: JSON.stringify(input) });
export const deleteStaff = (id: string, rowId: string) =>
  apiFetch<MessageResponse>(`/schools/${id}/staff/${rowId}`, { method: "DELETE" });
export const submitStaff = (id: string) =>
  apiFetch<MessageResponse>(`/schools/${id}/staff/submit`, { method: "POST" });

// ─── Media (images only) ──────────────────────────────────────────────────────

export const MEDIA_CATEGORIES = [
  "Module A", "Module B", "Module C", "Module D", "General",
] as const;

export interface SchoolMedia {
  id: string;
  category: string;
  caption: string;
  mediaType: string;
  fileUrl: string;
  publicId: string;
  originalFileName: string | null;
  format: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
  gpsLatitude: number | null;
  gpsLongitude: number | null;
  isPrimary: boolean;
  createdAt: string;
}

// Multipart upload — does NOT set Content-Type so the browser adds the boundary.
async function apiUpload<T = unknown>(
  path: string,
  formData: FormData,
  retryOn401 = true,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });
  } catch {
    throw new ApiError(
      "Can't reach the server. Check your connection and try again.",
      0,
    );
  }
  // Access token expired mid-upload: refresh once and replay. FormData is
  // reusable across fetches, so the same body can be re-sent.
  if (res.status === 401 && retryOn401 && canRefresh(path)) {
    if (await refreshSession()) {
      return apiUpload<T>(path, formData, false);
    }
  }
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const body = isJson ? await res.json() : null;
  if (!res.ok) {
    const raw = body && (body.message ?? body.error);
    const message = Array.isArray(raw)
      ? raw.join(", ")
      : raw || `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return body as T;
}

export const listMedia = (id: string) =>
  apiFetch<RegisterList<SchoolMedia>>(`/schools/${id}/media`);

export function uploadMedia(
  id: string,
  input: { file: File; category: string; caption: string; isPrimary: boolean },
): Promise<SchoolMedia> {
  const fd = new FormData();
  fd.append("file", input.file);
  fd.append("category", input.category);
  fd.append("caption", input.caption);
  fd.append("isPrimary", String(input.isPrimary));
  return apiUpload<SchoolMedia>(`/schools/${id}/media`, fd);
}

export const updateMedia = (
  id: string,
  mediaId: string,
  input: { category: string; caption: string; isPrimary: boolean },
) =>
  apiFetch<SchoolMedia>(`/schools/${id}/media/${mediaId}`, {
    method: "PUT",
    body: JSON.stringify({ ...input, isPrimary: String(input.isPrimary) }),
  });

export const deleteMedia = (id: string, mediaId: string) =>
  apiFetch<MessageResponse>(`/schools/${id}/media/${mediaId}`, { method: "DELETE" });

export const submitMedia = (id: string) =>
  apiFetch<MessageResponse>(`/schools/${id}/media/submit`, { method: "POST" });

// ─── Admin: user management (SYS_ADMIN) ───────────────────────────────────────

export const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "LIE", label: "LIE — Field inspector" },
  { value: "ZONAL_COORD", label: "Zonal Coordinator" },
  { value: "INSPECT_OFFICER", label: "Inspectorate Officer" },
  { value: "EMIS_OFFICER", label: "EMIS Officer" },
  { value: "HOD_APPROVE", label: "HOD / Director (approver)" },
  { value: "EXEC_VIEW", label: "Executive (dashboard only)" },
  { value: "SYS_ADMIN", label: "System Administrator" },
  { value: "SERVICE_ACCOUNT", label: "Service Account" },
  { value: "PRINCIPAL", label: "Principal — School head" },
];

export const ACCOUNT_STATUSES = [
  "PENDING", "ACTIVE", "SUSPENDED", "BANNED", "REJECTED", "DEACTIVATED",
] as const;

export type StatusAction = "SUSPEND" | "REACTIVATE" | "BAN" | "DEACTIVATE";

export interface AdminUser {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  phoneNumber: string;
  role: string;
  accountStatus: string;
  accountStatusReason: string | null;
  assignedLga: string | null;
  assignedZone: string | null;
  assignedCluster: string | null;
  assignedSchoolId: string | null;
  requiresPasswordChange: boolean;
  isServiceAccount: boolean;
  actionById: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScopeInput {
  role: string;
  assignedLga?: string | null;
  assignedZone?: string | null;
  assignedCluster?: string | null;
  assignedSchoolId?: string | null;
}

export function listUsers(params?: {
  status?: string;
  role?: string;
  q?: string;
}): Promise<AdminUser[]> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.role) qs.set("role", params.role);
  if (params?.q) qs.set("q", params.q);
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiFetch<AdminUser[]>(`/users${suffix}`);
}

export const getPendingCount = () =>
  apiFetch<{ pending: number }>("/users/pending-count");

export interface ProvisionInput extends ScopeInput {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

export const provisionUser = (input: ProvisionInput) =>
  apiFetch<{ user: AdminUser; tempPassword: string }>("/users", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const approveUser = (id: string, input: ScopeInput) =>
  apiFetch<AdminUser>(`/users/${id}/approve`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const rejectUser = (id: string, reason?: string) =>
  apiFetch<AdminUser>(`/users/${id}/reject`, {
    method: "PATCH",
    body: JSON.stringify({ reason }),
  });

export const updateUserRole = (id: string, input: ScopeInput) =>
  apiFetch<AdminUser>(`/users/${id}/role`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const changeUserStatus = (
  id: string,
  action: StatusAction,
  reason?: string,
) =>
  apiFetch<AdminUser>(`/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ action, reason }),
  });

export const resetUserPassword = (id: string) =>
  apiFetch<{ tempPassword: string }>(`/users/${id}/reset-password`, {
    method: "POST",
  });

// ─── Admin: reference data (sessions & school registry) ───────────────────────

export interface SessionRecord {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  createdAt: string;
  updatedAt: string;
}

export const listSessions = () => apiFetch<SessionRecord[]>("/sessions");

export const createSession = (input: {
  name: string;
  startDate?: string | null;
  endDate?: string | null;
  isCurrent?: boolean;
}) =>
  apiFetch<SessionRecord>("/sessions", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateSession = (
  id: string,
  input: { name?: string; startDate?: string | null; endDate?: string | null },
) =>
  apiFetch<SessionRecord>(`/sessions/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const activateSession = (id: string) =>
  apiFetch<SessionRecord>(`/sessions/${id}/activate`, { method: "PATCH" });

// ─── Capture periods (rounds within a session) ────────────────────────────────

export interface CapturePeriod {
  id: string;
  sessionId: string;
  name: string;
  sequence: number;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export const listPeriods = (sessionId: string) =>
  apiFetch<CapturePeriod[]>(`/sessions/${sessionId}/periods`);

export const createPeriod = (
  sessionId: string,
  input: { name: string; sequence?: number; startDate?: string | null; endDate?: string | null },
) =>
  apiFetch<CapturePeriod>(`/sessions/${sessionId}/periods`, {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updatePeriod = (
  id: string,
  input: { name?: string; sequence?: number; startDate?: string | null; endDate?: string | null },
) =>
  apiFetch<CapturePeriod>(`/sessions/periods/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const activatePeriod = (id: string) =>
  apiFetch<CapturePeriod>(`/sessions/periods/${id}/activate`, { method: "PATCH" });

// The live capture period (any authenticated user) — for capture-UI context.
export const getCurrentPeriod = () =>
  apiFetch<CapturePeriod>("/sessions/periods/current");

// School registry (admin) — full rows incl. inactive.
export const SCHOOL_TYPE_OPTIONS = [
  { value: "PRIMARY", label: "Primary" },
  { value: "JSS", label: "JSS" },
  { value: "SSS", label: "SSS" },
  { value: "COMBINED_PRY_JSS", label: "Primary + JSS" },
  { value: "COMBINED_JSS_SSS", label: "JSS + SSS" },
  { value: "COMBINED_PRY_SSS", label: "Primary–SSS" },
] as const;
export const OWNERSHIP_OPTIONS = ["PUBLIC", "MISSION", "PRIVATE"] as const;
export const CATEGORY_OPTIONS = ["DAY", "BOARDING", "SEMI_BOARDING"] as const;
export const GENDER_CATEGORY_OPTIONS = ["MIXED", "BOYS_ONLY", "GIRLS_ONLY"] as const;

export interface SchoolInput {
  code: string;
  name: string;
  type: string;
  ownership: string;
  category: string;
  genderCategory: string;
  lgaName: string;
  lgaCode?: string | null;
  zoneName?: string | null;
  cluster?: string | null;
  ward?: string | null;
  community?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isActive?: boolean;
}

export const listRegistrySchools = (params?: {
  lga?: string;
  q?: string;
  active?: string;
}) => {
  const qs = new URLSearchParams();
  if (params?.lga) qs.set("lga", params.lga);
  if (params?.q) qs.set("q", params.q);
  if (params?.active) qs.set("active", params.active);
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiFetch<SchoolMaster[]>(`/admin/schools${suffix}`);
};

export const createSchool = (input: SchoolInput) =>
  apiFetch<SchoolMaster>("/admin/schools", {
    method: "POST",
    body: JSON.stringify(input),
  });

export const updateSchool = (id: string, input: Partial<SchoolInput>) =>
  apiFetch<SchoolMaster>(`/admin/schools/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });

export const setSchoolActive = (id: string, isActive: boolean) =>
  apiFetch<SchoolMaster>(`/admin/schools/${id}/active`, {
    method: "PATCH",
    body: JSON.stringify({ isActive }),
  });

export const importSchools = (rows: SchoolInput[]) =>
  apiFetch<{ created: number; updated: number; total: number }>(
    "/admin/schools/import",
    { method: "POST", body: JSON.stringify({ rows }) },
  );

// ─── Oversight & verification (supervisors / SYS_ADMIN) ───────────────────────

export type SectionKey = "asc" | "students" | "staff" | "security" | "media";

export interface SubmissionItem {
  schoolId: string;
  name: string;
  code: string;
  lgaName: string;
  overallStatus: CaptureStatus;
  sections: Record<SectionKey, CaptureStatus>;
  submittedCount: number;
  verifiedCount: number;
}

export interface SubmissionsResponse {
  session: AcademicSession | null;
  summary: { schoolsAwaiting: number; sectionsAwaiting: number };
  items: SubmissionItem[];
}

export const getSubmissions = () =>
  apiFetch<SubmissionsResponse>("/oversight/submissions");

export interface RiskItem {
  schoolId: string;
  name: string;
  code: string;
  lgaName: string;
  riskTier: "High" | "Moderate" | "Low" | null;
  compositeRiskScore: number | null;
  isolationScore: number | null;
  infrastructureScore: number | null;
  communicationScore: number | null;
  recordStatus: CaptureStatus;
}

export interface RiskOverviewResponse {
  session: AcademicSession | null;
  tiers: { High: number; Moderate: number; Low: number };
  items: RiskItem[];
}

export const getRiskOverview = () =>
  apiFetch<RiskOverviewResponse>("/oversight/risk");

// ─── Admin analytics dashboard ────────────────────────────────────────────────

export interface AdminSummary {
  session: AcademicSession | null;
  totals: { schools: number; activeInspectors: number; enrolment: number };
  capture: {
    notStarted: number;
    draft: number;
    submitted: number;
    verified: number;
    completionRate: number;
  };
  verification: { schoolsAwaiting: number; sectionsAwaiting: number };
  risk: { High: number; Moderate: number; Low: number };
  byLga: {
    lga: string;
    schools: number;
    completed: number;
    completionRate: number;
  }[];
}

export const getAdminSummary = () =>
  apiFetch<AdminSummary>("/dashboard/admin/summary");

// ─── Audit log ────────────────────────────────────────────────────────────────

export interface AuditEntry {
  id: string;
  actorId: string | null;
  actorName: string | null;
  actorRole: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  targetLabel: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export const listAudit = (params?: { action?: string; take?: number; skip?: number }) => {
  const qs = new URLSearchParams();
  if (params?.action) qs.set("action", params.action);
  if (params?.take) qs.set("take", String(params.take));
  if (params?.skip) qs.set("skip", String(params.skip));
  const suffix = qs.toString() ? `?${qs}` : "";
  return apiFetch<{ rows: AuditEntry[]; total: number }>(`/audit${suffix}`);
};

export const verifySection = (schoolId: string, section: SectionKey) =>
  apiFetch<MessageResponse>(`/oversight/schools/${schoolId}/verify`, {
    method: "POST",
    body: JSON.stringify({ section }),
  });

export const returnSection = (schoolId: string, section: SectionKey) =>
  apiFetch<MessageResponse>(`/oversight/schools/${schoolId}/return`, {
    method: "POST",
    body: JSON.stringify({ section }),
  });

// ─── Force change of a temporary password (provisioned users) ─────────────────
export const forceChangePassword = (input: {
  email: string;
  oldPassword: string;
  newPassword: string;
}) =>
  apiFetch<MessageResponse>("/auth/force-change-password", {
    method: "POST",
    body: JSON.stringify(input),
  });
