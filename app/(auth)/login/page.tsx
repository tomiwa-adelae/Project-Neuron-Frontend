import Link from "next/link";
import { Lock } from "lucide-react";

import { AuthBrandPanel, BADGE } from "../_components/auth-brand-panel";
import { LoginForm } from "../_components/login-form";

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-neutral-100 sm:p-6">
      <div className="grid min-h-svh w-full max-w-5xl overflow-hidden bg-white shadow-xl sm:min-h-0 sm:rounded-2xl lg:min-h-[600px] lg:grid-cols-[5fr_6fr]">
        <AuthBrandPanel />

        <section className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-sm">
            <h2 className="font-heading text-2xl font-semibold text-neutral-900">
              Sign in
            </h2>
            <p className="mt-1 text-sm text-[#7a5b4c]">
              Use your assigned inspector credentials.
            </p>

            <div className="mt-7">
              <LoginForm />
            </div>

            <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-neutral-500">
              <Lock className="size-3" />
              Authorised personnel only · Oyo State MoEST
            </p>

            <p className="mt-4 text-center text-sm text-neutral-600">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="font-medium text-[#0b6b3a] hover:underline"
              >
                Register
              </Link>
            </p>

            {/* Mobile-only badges (desktop shows them in the brand panel) */}
            <div className="mt-8 flex items-center justify-between lg:hidden">
              <span className={BADGE}>MODULE 1 · LIVE</span>
              <span className="text-xs text-neutral-400">
                inspect.oyomoest.ng
              </span>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
