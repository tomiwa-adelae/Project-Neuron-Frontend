"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldX } from "lucide-react";
import { useAuth } from "../_components/app-shell";
import { isAdmin, canVerify, canViewRisk } from "@/lib/access";

// Most /admin pages are SYS_ADMIN-only; submissions & risk are open to the
// supervisor / leadership roles that can reach them.
function isAllowed(pathname: string, role: string): boolean {
  if (pathname.startsWith("/admin/submissions")) return canVerify(role);
  if (pathname.startsWith("/admin/risk")) return canViewRisk(role);
  return isAdmin(role);
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = useAuth();
  const pathname = usePathname();

  if (!isAllowed(pathname, user.role)) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <ShieldX className="mx-auto size-9 text-red-500" />
        <h2 className="mt-3 font-heading text-lg font-semibold text-neutral-900">
          Access restricted
        </h2>
        <p className="mt-1 text-sm text-neutral-600">
          You don&apos;t have permission to view this page.
        </p>
        <Link
          href="/"
          className="mt-4 inline-block text-sm font-medium text-[#0b6b3a] hover:underline"
        >
          Back to dashboard
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
