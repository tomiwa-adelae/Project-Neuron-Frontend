import { Star } from "lucide-react";

// Gold "MODULE 1 · LIVE" pill — shared by the brand panel (desktop) and the
// mobile footer on the auth pages.
export const BADGE =
  "rounded bg-[#caa44a] px-2.5 py-1 text-[0.7rem] font-bold tracking-wide text-[#3a2c05]";

/**
 * The deep-green MoEST brand panel shared by the login and register screens.
 * Per the NEURON standing rules the portal carries the Ministry's identity only
 * (no ZDT/Zionstand branding).
 */
export function AuthBrandPanel({ tagline }: { tagline?: string }) {
  return (
    <aside className="flex flex-col gap-8 bg-gradient-to-b from-[#0f5132] via-[#0c4127] to-[#062e1b] p-7 text-white sm:p-9 lg:p-10">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full border border-[#caa44a]/60">
          <Star className="size-5 fill-[#caa44a] text-[#caa44a]" />
        </span>
        <p className="text-xs font-semibold leading-tight">
          Oyo State Ministry of Education,
          <br />
          Science &amp; Technology
        </p>
      </div>

      <div className="mt-auto">
        <h1 className="font-heading text-4xl font-semibold tracking-[0.35em] sm:text-5xl">
          NEURON
        </h1>
        <div className="mt-3 h-0.5 w-12 rounded bg-[#caa44a]" />
        <p className="mt-4 text-base font-semibold">
          Local Inspector of Education Portal
        </p>
        <p className="mt-2 hidden max-w-xs text-sm leading-relaxed text-white/70 lg:block">
          {tagline ??
            "Field capture for school vulnerability and safety assessment across Oyo State."}
        </p>
        <div className="mt-6 hidden items-center gap-3 lg:flex">
          <span className={BADGE}>MODULE 1 · LIVE</span>
          <span className="text-xs text-white/60">inspect.oyomoest.ng</span>
        </div>
      </div>
    </aside>
  );
}
