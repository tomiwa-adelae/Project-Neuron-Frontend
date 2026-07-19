import * as z from "zod";

export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean(),
});

export type LoginSchemaType = z.infer<typeof LoginSchema>;

export const RegisterSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Enter a valid email address"),
    phoneNumber: z
      .string()
      .min(7, "Enter a valid phone number")
      .max(40, "Must be 40 characters or fewer"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    // Self-service account type. PRINCIPAL must also pick their school.
    role: z.enum(["LIE", "PRINCIPAL"]),
    requestedSchoolId: z.string().optional(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .superRefine((d, ctx) => {
    if (d.role === "PRINCIPAL" && !d.requestedSchoolId?.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["requestedSchoolId"],
        message: "Select the school you are the principal of.",
      });
    }
  });

export type RegisterSchemaType = z.infer<typeof RegisterSchema>;

// ─── Forgot password (3-step OTP flow) ───────────────────────────────────────

// Step 1 — request an OTP.
export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
});

export type ForgotPasswordSchemaType = z.infer<typeof ForgotPasswordSchema>;

// Step 2 — verify the 6-digit code (backend requires exactly 6 chars).
export const VerifyOtpSchema = z.object({
  otp: z.string().length(6, "Enter the 6-digit code"),
});

export type VerifyOtpSchemaType = z.infer<typeof VerifyOtpSchema>;

// Step 3 — set a new password.
export const ResetPasswordSchema = z
  .object({
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordSchemaType = z.infer<typeof ResetPasswordSchema>;
