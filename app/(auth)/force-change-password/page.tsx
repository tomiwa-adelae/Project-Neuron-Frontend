"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { AuthBrandPanel, BADGE } from "../_components/auth-brand-panel";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { forceChangePassword, ApiError } from "@/lib/api";

const FIELD =
  "h-11 rounded-md border-neutral-200 bg-neutral-50 text-sm text-neutral-900 placeholder:text-neutral-400 focus-visible:border-[#0b6b3a] focus-visible:ring-2 focus-visible:ring-[#0b6b3a]/20";

export default function ForceChangePasswordPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-neutral-100 sm:p-6">
      <div className="grid min-h-svh w-full max-w-5xl overflow-hidden bg-white shadow-xl sm:min-h-0 sm:rounded-2xl lg:min-h-[560px] lg:grid-cols-[5fr_6fr]">
        <AuthBrandPanel tagline="Set a new password to secure your inspector account." />
        <section className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-sm">
            <h2 className="font-heading text-2xl font-semibold text-neutral-900">
              Set a new password
            </h2>
            <p className="mt-1 text-sm text-[#7a5b4c]">
              Your account uses a temporary password. Choose a new one to
              continue.
            </p>
            <div className="mt-6">
              <Suspense
                fallback={
                  <div className="flex justify-center py-8">
                    <Loader2 className="size-5 animate-spin text-[#0b6b3a]" />
                  </div>
                }
              >
                <ForceChangeForm />
              </Suspense>
            </div>
            <div className="mt-8 flex items-center justify-between lg:hidden">
              <span className={BADGE}>MODULE 1 · LIVE</span>
              <span className="text-xs text-neutral-400">inspect.oyomoest.ng</span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function ForceChangeForm() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get("email") ?? "";

  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return toast.error("Missing account email. Return to sign in.");
    if (newPassword.length < 8)
      return toast.error("New password must be at least 8 characters.");
    if (newPassword !== confirm)
      return toast.error("Passwords do not match.");
    start(async () => {
      try {
        await forceChangePassword({ email, oldPassword, newPassword });
        toast.success("Password updated. Please sign in.");
        router.push("/login");
      } catch (err) {
        toast.error(
          err instanceof ApiError ? err.message : "Couldn't update password.",
        );
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-600">
        Account: <span className="font-medium text-neutral-900">{email || "—"}</span>
      </div>

      <Field
        label="Temporary password"
        value={oldPassword}
        onChange={setOldPassword}
        show={show}
        autoComplete="current-password"
      />
      <Field
        label="New password"
        value={newPassword}
        onChange={setNewPassword}
        show={show}
        autoComplete="new-password"
        placeholder="At least 8 characters"
      />
      <Field
        label="Confirm new password"
        value={confirm}
        onChange={setConfirm}
        show={show}
        autoComplete="new-password"
      />

      <label className="flex items-center gap-2 text-sm text-neutral-600">
        <input
          type="checkbox"
          checked={show}
          onChange={(e) => setShow(e.target.checked)}
          className="size-4 accent-[#0b6b3a]"
        />
        Show passwords
      </label>

      <Button
        type="submit"
        disabled={pending}
        className="h-11 w-full bg-[#0b6b3a] text-sm font-semibold text-white hover:bg-[#095a31]"
      >
        {pending ? (
          <>
            <Loader2 className="size-4 animate-spin" /> Updating…
          </>
        ) : (
          <>
            <ShieldCheck className="size-4" /> Update password
          </>
        )}
      </Button>

      <p className="text-center text-sm text-neutral-600">
        <Link href="/login" className="font-medium text-[#0b6b3a] hover:underline">
          Back to sign in
        </Link>
      </p>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  show,
  autoComplete,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  autoComplete: string;
  placeholder?: string;
}) {
  const [local, setLocal] = useState(false);
  const visible = show || local;
  return (
    <div>
      <label className="text-sm font-medium text-neutral-700">{label}</label>
      <div className="relative mt-1.5">
        <Input
          type={visible ? "text" : "password"}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          className={`${FIELD} pr-10`}
        />
        <button
          type="button"
          onClick={() => setLocal((v) => !v)}
          aria-label={visible ? "Hide" : "Show"}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-neutral-400 hover:text-neutral-600"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}
