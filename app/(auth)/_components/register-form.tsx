"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
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
import { RegisterSchema, type RegisterSchemaType } from "@/lib/zodSchema";
import {
  register as registerUser,
  getPublicSchools,
  ApiError,
  type PublicSchool,
} from "@/lib/api";

type AccountType = "LIE" | "PRINCIPAL";

const FIELD =
  "h-11 rounded-md border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:border-[#0b6b3a] focus-visible:ring-2 focus-visible:ring-[#0b6b3a]/20";

export function RegisterForm() {
  const [pending, startTransition] = useTransition();
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Account type is managed outside the zod form: a default field inspector (LIE)
  // or a school principal, who must also pick their school.
  const [accountType, setAccountType] = useState<AccountType>("LIE");
  const [schoolId, setSchoolId] = useState("");
  const [schools, setSchools] = useState<PublicSchool[]>([]);
  const isPrincipal = accountType === "PRINCIPAL";

  useEffect(() => {
    if (!isPrincipal || schools.length) return;
    getPublicSchools()
      .then((r) => setSchools(r.schools))
      .catch(() => toast.error("Couldn't load the list of schools."));
  }, [isPrincipal, schools.length]);

  const form = useForm<RegisterSchemaType>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (values: RegisterSchemaType) => {
    if (isPrincipal && !schoolId) {
      toast.error("Select the school you are the principal of.");
      return;
    }
    startTransition(async () => {
      try {
        await registerUser(
          isPrincipal
            ? { ...values, role: "PRINCIPAL", requestedSchoolId: schoolId }
            : values,
        );
        toast.success("Registration submitted.");
        setSubmitted(true);
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Registration failed. Please try again.",
        );
      }
    });
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-6 text-center">
        <CheckCircle2 className="mx-auto size-10 text-[#0b6b3a]" />
        <h3 className="mt-3 font-heading text-lg font-semibold text-neutral-900">
          Registration received
        </h3>
        <p className="mt-1 text-sm text-neutral-600">
          Your account is pending Ministry approval. You&apos;ll be able to sign
          in once an administrator activates it.
        </p>
        <Button
          asChild
          className="mt-5 h-11 w-full bg-[#0b6b3a] text-sm font-semibold text-white hover:bg-[#095a31]"
        >
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* Account type */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-neutral-700">
            I am registering as
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                ["LIE", "Field inspector"],
                ["PRINCIPAL", "School principal"],
              ] as [AccountType, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setAccountType(value)}
                aria-pressed={accountType === value}
                className={
                  "h-11 rounded-md border px-3 text-sm font-medium transition-colors " +
                  (accountType === value
                    ? "border-[#0b6b3a] bg-[#0b6b3a]/5 text-[#0b6b3a]"
                    : "border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100")
                }
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* School picker — principals only */}
        {isPrincipal && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">
              Your school <span className="text-red-500">*</span>
            </label>
            <select
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className={`${FIELD} w-full px-3`}
            >
              <option value="">Select your school…</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code}) · {s.lgaName}
                </option>
              ))}
            </select>
            <p className="text-xs text-neutral-500">
              An administrator will confirm your school before your account is
              activated.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-neutral-700">First name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="given-name"
                    placeholder="Tunde"
                    className={FIELD}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-neutral-700">Last name</FormLabel>
                <FormControl>
                  <Input
                    autoComplete="family-name"
                    placeholder="Adeyemi"
                    className={FIELD}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

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
                  placeholder="e.g. inspector@oyomoest.ng"
                  className={FIELD}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phoneNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-neutral-700">Phone number</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="e.g. 0803 000 0000"
                  className={FIELD}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-neutral-700">Password</FormLabel>
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
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </Form>
  );
}
