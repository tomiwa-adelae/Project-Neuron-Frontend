import { AuthBrandPanel, BADGE } from "../_components/auth-brand-panel";
import { ForgotPasswordForm } from "../_components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-neutral-100 sm:p-6">
      <div className="grid min-h-svh w-full max-w-5xl overflow-hidden bg-white shadow-xl sm:min-h-0 sm:rounded-2xl lg:min-h-[600px] lg:grid-cols-[5fr_6fr]">
        <AuthBrandPanel tagline="Reset your inspector password to regain access to the field portal." />

        <section className="flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
          <div className="mx-auto w-full max-w-sm">
            <h2 className="font-heading text-2xl font-semibold text-neutral-900">
              Reset password
            </h2>
            <p className="mt-1 text-sm text-[#7a5b4c]">
              Enter your account email and we&apos;ll send a verification code.
            </p>

            <div className="mt-7">
              <ForgotPasswordForm />
            </div>

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
