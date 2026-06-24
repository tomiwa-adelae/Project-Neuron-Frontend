"use client";

import { useEffect, useState, useTransition } from "react";
import { CheckCircle2, Clock, Loader2, Mail, Phone, X } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  listUsers,
  approveUser,
  rejectUser,
  ApiError,
  type AdminUser,
  type ScopeInput,
} from "@/lib/api";
import { RoleScopeFields } from "../_components/admin-bits";

export default function ApprovalsPage() {
  const [rows, setRows] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<AdminUser | null>(null);
  const [rejecting, setRejecting] = useState<AdminUser | null>(null);

  const load = () =>
    listUsers({ status: "PENDING" }).then(setRows);

  useEffect(() => {
    load()
      .catch((e) =>
        toast.error(e instanceof ApiError ? e.message : "Couldn't load approvals."),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[#0b6b3a]" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-neutral-900">
          Pending approvals
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Review self-registered accounts. Approving sets the account&apos;s role
          and scope and activates it.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-12 text-center">
          <CheckCircle2 className="mx-auto size-8 text-[#0b6b3a]" />
          <p className="mt-2 text-sm text-neutral-500">
            No pending registrations. You&apos;re all caught up.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((u) => (
            <li
              key={u.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white p-4"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-neutral-900">
                  {u.firstName} {u.lastName}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500">
                  <span className="inline-flex items-center gap-1">
                    <Mail className="size-3" /> {u.email}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Phone className="size-3" /> {u.phoneNumber}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" />
                    {new Date(u.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  variant="outline"
                  onClick={() => setRejecting(u)}
                  className="h-9 border-red-200 text-red-600 hover:bg-red-50"
                >
                  <X className="size-4" />
                  Reject
                </Button>
                <Button
                  onClick={() => setApproving(u)}
                  className="h-9 bg-[#0b6b3a] text-white hover:bg-[#095a31]"
                >
                  <CheckCircle2 className="size-4" />
                  Approve
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {approving && (
        <ApproveDialog
          user={approving}
          onClose={() => setApproving(null)}
          onDone={async () => {
            setApproving(null);
            await load();
          }}
        />
      )}
      {rejecting && (
        <RejectDialog
          user={rejecting}
          onClose={() => setRejecting(null)}
          onDone={async () => {
            setRejecting(null);
            await load();
          }}
        />
      )}
    </div>
  );
}

function ApproveDialog({
  user,
  onClose,
  onDone,
}: {
  user: AdminUser;
  onClose: () => void;
  onDone: () => void;
}) {
  const [scope, setScope] = useState<ScopeInput>({
    role: user.role || "LIE",
    assignedLga: user.assignedLga,
    assignedZone: user.assignedZone,
    assignedCluster: user.assignedCluster,
  });
  const [saving, startSave] = useTransition();

  const save = () => {
    if (scope.role === "LIE" && !scope.assignedLga?.trim()) {
      return toast.error("Assign an LGA for a field inspector.");
    }
    startSave(async () => {
      try {
        await approveUser(user.id, scope);
        toast.success(`${user.firstName} approved.`);
        onDone();
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Couldn't approve.");
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Approve {user.firstName} {user.lastName}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-neutral-500">
            Set the role and scope this account will have once active.
          </p>
          <RoleScopeFields value={scope} onChange={setScope} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-[#0b6b3a] text-white hover:bg-[#095a31]"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Approve &amp; activate
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({
  user,
  onClose,
  onDone,
}: {
  user: AdminUser;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, startSave] = useTransition();

  const save = () => {
    startSave(async () => {
      try {
        await rejectUser(user.id, reason.trim() || undefined);
        toast.success(`${user.firstName}'s registration rejected.`);
        onDone();
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Couldn't reject.");
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject {user.firstName} {user.lastName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-700">
            Reason (optional — included in the email)
          </label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="e.g. Could not verify your posting."
            className="text-sm"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Reject registration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
