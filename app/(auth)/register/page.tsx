import Link from "next/link";

import { AuthBrandPanel, BADGE } from "../_components/auth-brand-panel";
import { RegisterForm } from "../_components/register-form";

export default function RegisterPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-neutral-100 sm:p-6">
      <div className="grid min-h-svh w-full max-w-5xl overflow-hidden bg-white shadow-xl sm:min-h-0 sm:rounded-2xl lg:min-h-[640px] lg:grid-cols-[5fr_6fr]">
        <AuthBrandPanel tagline="Register to capture school vulnerability and safety data across Oyo State." />

        <section className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-sm">
            <h2 className="font-heading text-2xl font-semibold text-neutral-900">
              Create account
            </h2>
            <p className="mt-1 text-sm text-[#7a5b4c]">
              Request an inspector account. Access is granted after Ministry
              approval.
            </p>

            <div className="mt-6">
              <RegisterForm />
            </div>

            <p className="mt-4 text-center text-sm text-neutral-600">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-medium text-[#0b6b3a] hover:underline"
              >
                Sign in
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
