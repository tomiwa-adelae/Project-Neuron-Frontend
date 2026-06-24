// Frontend role capability checks — mirror the backend role constants so the UI
// only shows what each role can actually reach. Backend remains the source of
// truth (it re-checks every request).

export const SYS_ADMIN = "SYS_ADMIN";

// Roles that see the aggregated state/zone dashboard instead of the LIE worklist.
const DASHBOARD_ROLES = [
  "SYS_ADMIN",
  "ZONAL_COORD",
  "EMIS_OFFICER",
  "EXEC_VIEW",
  "HOD_APPROVE",
];

// Roles that can verify / return submitted sections.
const VERIFY_ROLES = ["SYS_ADMIN", "ZONAL_COORD", "EMIS_OFFICER", "HOD_APPROVE"];

// Roles that can view the risk overview (verifiers + leadership).
const RISK_ROLES = [
  "SYS_ADMIN",
  "ZONAL_COORD",
  "EMIS_OFFICER",
  "EXEC_VIEW",
  "HOD_APPROVE",
];

// Field roles that capture data (LIE → LGA-scoped, INSPECT_OFFICER → cluster).
const CAPTURE_ROLES = ["LIE", "INSPECT_OFFICER"];

export const isAdmin = (role: string) => role === SYS_ADMIN;
export const canViewAdminDashboard = (role: string) =>
  DASHBOARD_ROLES.includes(role);
export const canVerify = (role: string) => VERIFY_ROLES.includes(role);
export const canViewRisk = (role: string) => RISK_ROLES.includes(role);
export const isCaptureRole = (role: string) => CAPTURE_ROLES.includes(role);
