"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  School,
  ClipboardList,
  ClipboardCheck,
  ShieldAlert,
  CalendarDays,
  Loader2,
  LogOut,
  Menu,
  ScrollText,
  Star,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { getMe, logout as logoutApi, ApiError, type MeResponse } from "@/lib/api";
import {
  isAdmin,
  canViewAdminDashboard,
  canVerify,
  canViewRisk,
  isCaptureRole,
} from "@/lib/access";

// ─── Auth context ─────────────────────────────────────────────────────────────

const AuthContext = createContext<MeResponse | null>(null);

export function useAuth(): MeResponse {
  const user = useContext(AuthContext);
  if (!user) {
    // The shell only renders children once a user is loaded, so this is a
    // programming error (using the hook outside the shell) rather than a state.
    throw new Error("useAuth must be used within the authenticated AppShell");
  }
  return user;
}

type NavItem = { href: string; label: string; icon: typeof LayoutDashboard };

// Each role sees only what it can reach. SYS_ADMIN → full console; supervisors /
// leadership → oversight subset; LIE → capture nav; others → minimal.
function navFor(role: string): NavItem[] {
  if (isAdmin(role)) {
    return [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/approvals", label: "Approvals", icon: UserCheck },
      { href: "/admin/submissions", label: "Submissions", icon: ClipboardCheck },
      { href: "/admin/risk", label: "Risk overview", icon: ShieldAlert },
      { href: "/admin/users", label: "Users", icon: Users },
      { href: "/admin/sessions", label: "Sessions", icon: CalendarDays },
      { href: "/admin/schools", label: "School registry", icon: School },
      { href: "/admin/audit", label: "Audit log", icon: ScrollText },
    ];
  }

  // Supervisors (ZONAL/EMIS/HOD) and leadership (EXEC_VIEW).
  if (canViewAdminDashboard(role)) {
    const items: NavItem[] = [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
    ];
    if (canVerify(role)) {
      items.push({ href: "/admin/submissions", label: "Submissions", icon: ClipboardCheck });
    }
    if (canViewRisk(role)) {
      items.push({ href: "/admin/risk", label: "Risk overview", icon: ShieldAlert });
    }
    return items;
  }

  // LIE field inspectors.
  if (isCaptureRole(role)) {
    return [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/schools", label: "Schools", icon: School },
      { href: "/captures", label: "My captures", icon: ClipboardList },
    ];
  }

  // Roles without a configured workspace yet (e.g. INSPECT_OFFICER).
  return [{ href: "/", label: "Dashboard", icon: LayoutDashboard }];
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<MeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Client-side guard: the JWT lives in an httpOnly cookie on the API origin,
  // so identity is resolved by calling /auth/me from the browser. A 401/403
  // bounces to /login.
  useEffect(() => {
    let active = true;
    getMe()
      .then((me) => {
        if (active) setUser(me);
      })
      .catch((err) => {
        if (!active) return;
        if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
          router.replace("/login");
        } else {
          toast.error("Couldn't load your session. Please sign in again.");
          router.replace("/login");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-neutral-100">
        <Loader2 className="size-6 animate-spin text-[#0b6b3a]" />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={user}>
      <div className="flex min-h-svh bg-neutral-100">
        {/* Sidebar */}
        <Sidebar
          mobileOpen={mobileOpen}
          onClose={() => setMobileOpen(false)}
        />

        {/* Main column */}
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar user={user} onMenu={() => setMobileOpen(true)} />
          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </AuthContext.Provider>
  );
}

function Sidebar({
  mobileOpen,
  onClose,
}: {
  mobileOpen: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const user = useAuth();
  const items = navFor(user.role);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
      {items.map(({ href, label, icon: Icon }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-white/10 text-white"
                : "text-white/70 hover:bg-white/5 hover:text-white",
            )}
          >
            <Icon className="size-4.5 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  const brand = (
    <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-full border border-[#caa44a]/60">
        <Star className="size-4 fill-[#caa44a] text-[#caa44a]" />
      </span>
      <div className="leading-tight">
        <p className="font-heading text-lg font-semibold tracking-[0.25em] text-white">
          NEURON
        </p>
        <p className="text-[0.65rem] text-white/60">Oyo State MoEST</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 flex-col bg-gradient-to-b from-[#0f5132] via-[#0c4127] to-[#062e1b] lg:flex">
        {brand}
        {nav}
        <p className="px-5 py-4 text-[0.65rem] text-white/40">
          Module 1 · Field Capture
        </p>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
            aria-hidden
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-gradient-to-b from-[#0f5132] via-[#0c4127] to-[#062e1b]">
            <div className="flex items-center justify-between border-b border-white/10 pr-3">
              {brand}
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="text-white/70 hover:text-white"
              >
                <X className="size-5" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}
    </>
  );
}

function TopBar({ user, onMenu }: { user: MeResponse; onMenu: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const onLogout = () => {
    startTransition(async () => {
      try {
        await logoutApi();
      } catch {
        // Even if the call fails, send the user to login — the cookie may be gone.
      }
      toast.success("Signed out.");
      router.replace("/login");
    });
  };

  const initials =
    `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
      <button
        onClick={onMenu}
        aria-label="Open menu"
        className="text-neutral-600 hover:text-neutral-900 lg:hidden"
      >
        <Menu className="size-5" />
      </button>

      <div className="hidden lg:block">
        <span className="rounded bg-[#0b6b3a]/10 px-2 py-0.5 text-xs font-semibold text-[#0b6b3a]">
          {user.role}
        </span>
        {user.assignedLga && (
          <span className="ml-2 text-sm text-neutral-500">
            {user.assignedLga} LGA
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm font-medium text-neutral-900">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-neutral-500">{user.email}</p>
        </div>
        <span className="flex size-9 items-center justify-center rounded-full bg-[#0b6b3a] text-sm font-semibold text-white">
          {initials || "?"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={onLogout}
          disabled={pending}
          className="text-neutral-600 hover:text-neutral-900"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
