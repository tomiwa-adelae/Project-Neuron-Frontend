"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  MailCheck,
} from "lucide-react";
import { toast } from "sonner";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import {
  ForgotPasswordSchema,
  type ForgotPasswordSchemaType,
  VerifyOtpSchema,
  type VerifyOtpSchemaType,
  ResetPasswordSchema,
  type ResetPasswordSchemaType,
} from "@/lib/zodSchema";
import {
  forgotPassword,
  verifyOtp,
  resetPassword,
  ApiError,
} from "@/lib/api";

const FIELD =
  "h-11 rounded-md border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:border-[#0b6b3a] focus-visible:ring-2 focus-visible:ring-[#0b6b3a]/20";

type Step = "email" | "otp" | "reset" | "done";

export function ForgotPasswordForm() {
  const [step, setStep] = useState<Step>("email");
  // Carried across steps — the API needs email + otp on the final reset call.
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  switch (step) {
    case "email":
      return (
        <EmailStep
          onSent={(sentEmail) => {
            setEmail(sentEmail);
            setStep("otp");
          }}
        />
      );
    case "otp":
      return (
        <OtpStep
          email={email}
          onBack={() => setStep("email")}
          onResend={() => forgotPassword(email)}
          onVerified={(code) => {
            setOtp(code);
            setStep("reset");
          }}
        />
      );
    case "reset":
      return (
        <ResetStep
          email={email}
          otp={otp}
          onDone={() => setStep("done")}
        />
      );
    case "done":
      return <DoneStep />;
  }
}

// ─── Step 1: email ────────────────────────────────────────────────────────────

function EmailStep({ onSent }: { onSent: (email: string) => void }) {
  const [pending, startTransition] = useTransition();
  const form = useForm<ForgotPasswordSchemaType>({
    resolver: zodResolver(ForgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = (values: ForgotPasswordSchemaType) => {
    startTransition(async () => {
      try {
        await forgotPassword(values.email);
        toast.success("If that email exists, a code is on its way.");
        onSent(values.email);
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Couldn't send the code. Please try again.",
        );
      }
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
      >
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-neutral-700">Email</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="e.g. inspector@oyomoest.ng"
                  className={FIELD}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full bg-[#0b6b3a] text-sm font-semibold text-white hover:bg-[#095a31]"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Sending code…
            </>
          ) : (
            "Send reset code"
          )}
        </Button>

        <p className="text-center text-sm text-neutral-600">
          <Link
            href="/login"
            className="inline-flex items-center gap-1 font-medium text-[#0b6b3a] hover:underline"
          >
            <ArrowLeft className="size-3.5" />
            Back to sign in
          </Link>
        </p>
      </form>
    </Form>
  );
}

// ─── Step 2: OTP ────────────────────────────────────────────────────────────

function OtpStep({
  email,
  onBack,
  onResend,
  onVerified,
}: {
  email: string;
  onBack: () => void;
  onResend: () => Promise<unknown>;
  onVerified: (otp: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [resending, setResending] = useState(false);
  const form = useForm<VerifyOtpSchemaType>({
    resolver: zodResolver(VerifyOtpSchema),
    defaultValues: { otp: "" },
  });

  const onSubmit = (values: VerifyOtpSchemaType) => {
    startTransition(async () => {
      try {
        await verifyOtp({ email, otp: values.otp });
        onVerified(values.otp);
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't verify the code.",
        );
      }
    });
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await onResend();
      toast.success("A new code has been sent.");
      form.reset({ otp: "" });
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "Couldn't resend the code.",
      );
    } finally {
      setResending(false);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-5"
        noValidate
      >
        <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm text-neutral-600">
          We sent a 6-digit code to{" "}
          <span className="font-medium text-neutral-900">{email}</span>. It
          expires in 10 minutes.
        </div>

        <FormField
          control={form.control}
          name="otp"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-neutral-700">
                Verification code
              </FormLabel>
              <FormControl>
                <InputOTP
                  maxLength={6}
                  value={field.value}
                  onChange={field.onChange}
                  containerClassName="justify-center"
                >
                  <InputOTPGroup className="gap-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <InputOTPSlot
                        key={i}
                        index={i}
                        className="size-11 rounded-md border border-neutral-200 bg-neutral-50 text-base"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full bg-[#0b6b3a] text-sm font-semibold text-white hover:bg-[#095a31]"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Verifying…
            </>
          ) : (
            "Verify code"
          )}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 font-medium text-neutral-600 hover:text-neutral-900"
          >
            <ArrowLeft className="size-3.5" />
            Change email
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={resending}
            className="font-medium text-[#0b6b3a] hover:underline disabled:opacity-50"
          >
            {resending ? "Resending…" : "Resend code"}
          </button>
        </div>
      </form>
    </Form>
  );
}

// ─── Step 3: new password ─────────────────────────────────────────────────────

function ResetStep({
  email,
  otp,
  onDone,
}: {
  email: string;
  otp: string;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const form = useForm<ResetPasswordSchemaType>({
    resolver: zodResolver(ResetPasswordSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  });

  const onSubmit = (values: ResetPasswordSchemaType) => {
    startTransition(async () => {
      try {
        await resetPassword({
          email,
          otp,
          newPassword: values.newPassword,
          confirmPassword: values.confirmPassword,
        });
        toast.success("Password reset. You can now sign in.");
        onDone();
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Couldn't reset the password.",
        );
      }
    });
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="space-y-4"
        noValidate
      >
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-neutral-700">New password</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={showPw ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="At least 8 characters"
                    className={`${FIELD} pr-10`}
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  aria-label={showPw ? "Hide password" : "Show password"}
                  aria-pressed={showPw}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-neutral-400 transition-colors hover:text-neutral-600"
                >
                  {showPw ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-neutral-700">
                Confirm password
              </FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    className={`${FIELD} pr-10`}
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                  aria-pressed={showConfirm}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-neutral-400 transition-colors hover:text-neutral-600"
                >
                  {showConfirm ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full bg-[#0b6b3a] text-sm font-semibold text-white hover:bg-[#095a31]"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Resetting…
            </>
          ) : (
            "Reset password"
          )}
        </Button>
      </form>
    </Form>
  );
}

// ─── Step 4: done ─────────────────────────────────────────────────────────────

function DoneStep() {
  const router = useRouter();
  return (
    <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
      <CheckCircle2 className="mx-auto size-10 text-[#0b6b3a]" />
      <h3 className="mt-3 font-heading text-lg font-semibold text-neutral-900">
        Password reset
      </h3>
      <p className="mt-1 text-sm text-neutral-600">
        Your password has been updated. Sign in with your new password to
        continue.
      </p>
      <Button
        onClick={() => router.push("/login")}
        className="mt-5 h-11 w-full bg-[#0b6b3a] text-sm font-semibold text-white hover:bg-[#095a31]"
      >
        <MailCheck className="size-4" />
        Go to sign in
      </Button>
    </div>
  );
}
