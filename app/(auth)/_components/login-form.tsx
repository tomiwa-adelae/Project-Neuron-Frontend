"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { LoginSchema, type LoginSchemaType } from "@/lib/zodSchema";
import { login, ApiError } from "@/lib/api";

// Field-sized inputs (the shadcn "radix-mira" defaults are ~28px — too small for
// field use on a phone) with a green focus ring to match the brand.
const FIELD =
  "h-11 rounded-md border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:border-[#0b6b3a] focus-visible:ring-2 focus-visible:ring-[#0b6b3a]/20";

export function LoginForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [isVisible, setIsVisible] = useState(false);

  const form = useForm<LoginSchemaType>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const onSubmit = (values: LoginSchemaType) => {
    startTransition(async () => {
      try {
        const res = await login(values);

        // Provisioned users with a temporary password must change it first.
        if (res.requiresPasswordChange) {
          toast.info("Please set a new password to continue.");
          router.push(
            `/force-change-password?email=${encodeURIComponent(res.email ?? values.email)}`,
          );
          return;
        }

        toast.success(`Welcome back, ${res.user?.firstName ?? "Inspector"}!`);
        router.push("/");
      } catch (err) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "Login failed. Please try again.",
        );
      }
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5" noValidate>
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

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-neutral-700">Password</FormLabel>
              <div className="relative">
                <FormControl>
                  <Input
                    type={isVisible ? "text" : "password"}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className={`${FIELD} pr-10`}
                    {...field}
                  />
                </FormControl>
                <button
                  type="button"
                  onClick={() => setIsVisible((v) => !v)}
                  aria-label={isVisible ? "Hide password" : "Show password"}
                  aria-pressed={isVisible}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-neutral-400 transition-colors hover:text-neutral-600"
                >
                  {isVisible ? (
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

        <div className="flex items-center justify-between">
          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center gap-2 space-y-0">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={(v) => field.onChange(v === true)}
                  />
                </FormControl>
                <FormLabel className="cursor-pointer text-sm font-normal text-neutral-600">
                  Keep me signed in
                </FormLabel>
              </FormItem>
            )}
          />
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-[#0b6b3a] hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <Button
          type="submit"
          disabled={pending}
          className="h-11 w-full bg-[#0b6b3a] text-sm font-semibold text-white hover:bg-[#095a31]"
        >
          {pending ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </Button>
      </form>
    </Form>
  );
}
