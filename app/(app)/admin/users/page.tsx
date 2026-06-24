"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Ban,
  Copy,
  KeyRound,
  Loader2,
  MoreVertical,
  Pencil,
  Power,
  PowerOff,
  Search,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  listUsers,
  provisionUser,
  updateUserRole,
  changeUserStatus,
  resetUserPassword,
  ACCOUNT_STATUSES,
  ROLE_OPTIONS,
  ApiError,
  type AdminUser,
  type ScopeInput,
  type StatusAction,
} from "@/lib/api";
import { useAuth } from "../../_components/app-shell";
import { RoleScopeFields, UserStatusBadge, roleLabel } from "../_components/admin-bits";
import { TextField } from "../../_components/form-fields";

export default function UsersPage() {
  const me = useAuth();
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");

  const [provisionOpen, setProvisionOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [tempPassword, setTempPassword] = useState<{ email: string; pw: string } | null>(null);

  const load = () =>
    listUsers({ status: status || undefined, role: role || undefined }).then(setRows);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((e) =>
        toast.error(e instanceof ApiError ? e.message : "Couldn't load users."),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, role]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (u) =>
        `${u.firstName} ${u.lastName}`.toLowerCase().includes(needle) ||
        u.email.toLowerCase().includes(needle),
    );
  }, [rows, q]);

  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      await load();
      toast.success(ok);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Action failed.");
    }
  };

  const SELECT =
    "h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b6b3a]/20";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-neutral-900">
            Users
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Provision accounts, set roles &amp; scope, and manage access.
          </p>
        </div>
        <Button
          onClick={() => setProvisionOpen(true)}
          className="h-10 bg-[#0b6b3a] text-white hover:bg-[#095a31]"
        >
          <UserPlus className="size-4" />
          Provision user
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or email"
            className="h-10 pl-9 text-sm"
          />
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={SELECT}>
          <option value="">All statuses</option>
          {ACCOUNT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value)} className={SELECT}>
          <option value="">All roles</option>
          {ROLE_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.value}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-[#0b6b3a]" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
          No users match these filters.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {filtered.map((u) => {
            const isSelf = u.id === me.id;
            return (
              <li key={u.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {u.firstName} {u.lastName}
                    {isSelf && <span className="ml-2 text-xs text-neutral-400">(you)</span>}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    {u.email}
                    {u.assignedLga ? ` · ${u.assignedLga}` : ""}
                    {u.assignedZone ? ` · ${u.assignedZone}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden text-xs font-medium text-neutral-500 sm:inline">
                    {roleLabel(u.role).split(" — ")[0]}
                  </span>
                  <UserStatusBadge status={u.accountStatus} />
                  <RowActions
                    user={u}
                    isSelf={isSelf}
                    onEdit={() => setEditing(u)}
                    onStatus={(action) =>
                      act(
                        () => changeUserStatus(u.id, action),
                        `${u.firstName} updated.`,
                      )
                    }
                    onReset={() =>
                      act(async () => {
                        const { tempPassword } = await resetUserPassword(u.id);
                        setTempPassword({ email: u.email, pw: tempPassword });
                      }, "Password reset.")
                    }
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {provisionOpen && (
        <ProvisionDialog
          onClose={() => setProvisionOpen(false)}
          onDone={async (res) => {
            setProvisionOpen(false);
            setTempPassword({ email: res.user.email, pw: res.tempPassword });
            await load();
          }}
        />
      )}
      {editing && (
        <EditRoleDialog
          user={editing}
          onClose={() => setEditing(null)}
          onDone={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
      {tempPassword && (
        <TempPasswordDialog
          email={tempPassword.email}
          pw={tempPassword.pw}
          onClose={() => setTempPassword(null)}
        />
      )}
    </div>
  );
}

function RowActions({
  user,
  isSelf,
  onEdit,
  onStatus,
  onReset,
}: {
  user: AdminUser;
  isSelf: boolean;
  onEdit: () => void;
  onStatus: (action: StatusAction) => void;
  onReset: () => void;
}) {
  const s = user.accountStatus;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
          aria-label="Actions"
        >
          <MoreVertical className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onEdit} disabled={isSelf}>
          <Pencil className="size-4" /> Edit role &amp; scope
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onReset}>
          <KeyRound className="size-4" /> Reset password
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {s === "ACTIVE" && (
          <DropdownMenuItem onClick={() => onStatus("SUSPEND")} disabled={isSelf}>
            <PowerOff className="size-4" /> Suspend
          </DropdownMenuItem>
        )}
        {(s === "SUSPENDED" || s === "DEACTIVATED" || s === "BANNED") && (
          <DropdownMenuItem onClick={() => onStatus("REACTIVATE")} disabled={isSelf}>
            <Power className="size-4" /> Reactivate
          </DropdownMenuItem>
        )}
        {s !== "DEACTIVATED" && s !== "BANNED" && (
          <DropdownMenuItem onClick={() => onStatus("DEACTIVATE")} disabled={isSelf}>
            <PowerOff className="size-4" /> Deactivate
          </DropdownMenuItem>
        )}
        {s !== "BANNED" && (
          <DropdownMenuItem
            onClick={() => onStatus("BAN")}
            disabled={isSelf}
            className="text-red-600"
          >
            <Ban className="size-4" /> Ban
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProvisionDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: (res: { user: AdminUser; tempPassword: string }) => void;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [scope, setScope] = useState<ScopeInput>({ role: "LIE" });
  const [saving, startSave] = useTransition();

  const save = () => {
    if (!firstName || !lastName || !email || !phoneNumber) {
      return toast.error("Name, email and phone are required.");
    }
    startSave(async () => {
      try {
        const res = await provisionUser({
          firstName,
          lastName,
          email,
          phoneNumber,
          ...scope,
        });
        toast.success("Account provisioned.");
        onDone(res);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Couldn't provision.");
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Provision a user</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="First name" required value={firstName} onChange={(v) => setFirstName(v ?? "")} />
          <TextField label="Last name" required value={lastName} onChange={(v) => setLastName(v ?? "")} />
          <TextField label="Email" required value={email} onChange={(v) => setEmail(v ?? "")} type="email" />
          <TextField label="Phone number" required value={phoneNumber} onChange={(v) => setPhoneNumber(v ?? "")} />
          <div className="sm:col-span-2 space-y-4">
            <RoleScopeFields value={scope} onChange={setScope} />
          </div>
        </div>
        <p className="rounded-md bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
          A temporary password is generated and emailed to the user; they&apos;ll
          be required to change it at first login.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="bg-[#0b6b3a] text-white hover:bg-[#095a31]">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Create account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditRoleDialog({
  user,
  onClose,
  onDone,
}: {
  user: AdminUser;
  onClose: () => void;
  onDone: () => void;
}) {
  const [scope, setScope] = useState<ScopeInput>({
    role: user.role,
    assignedLga: user.assignedLga,
    assignedZone: user.assignedZone,
    assignedCluster: user.assignedCluster,
  });
  const [saving, startSave] = useTransition();

  const save = () => {
    startSave(async () => {
      try {
        await updateUserRole(user.id, scope);
        toast.success("Role updated.");
        onDone();
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Couldn't update.");
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Edit {user.firstName} {user.lastName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <RoleScopeFields value={scope} onChange={setScope} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="bg-[#0b6b3a] text-white hover:bg-[#095a31]">
            {saving && <Loader2 className="size-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TempPasswordDialog({
  email,
  pw,
  onClose,
}: {
  email: string;
  pw: string;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Temporary password</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-neutral-600">
            Share this one-time password with <strong>{email}</strong>. It was
            also emailed to them. They&apos;ll change it at first login.
          </p>
          <div className="flex items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2.5">
            <code className="text-sm font-semibold text-neutral-900">{pw}</code>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(pw);
                toast.success("Copied.");
              }}
              className="rounded p-1.5 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-700"
              aria-label="Copy"
            >
              <Copy className="size-4" />
            </button>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={onClose} className="bg-[#0b6b3a] text-white hover:bg-[#095a31]">
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
