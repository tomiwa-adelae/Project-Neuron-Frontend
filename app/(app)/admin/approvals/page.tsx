"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Form } from "@/components/ui/form";
import {
  listUsers,
  approveUser,
  rejectUser,
  ApiError,
  type AdminUser,
  type ScopeInput,
} from "@/lib/api";
import {
  ScopeSchema,
  type ScopeSchemaType,
  RejectSchema,
  type RejectSchemaType,
} from "@/lib/schemas";
import { RoleScopeFields } from "../_components/admin-bits";
import { RHFTextarea } from "../../_components/rhf-fields";

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
  const form = useForm<ScopeSchemaType>({
    resolver: zodResolver(ScopeSchema),
    defaultValues: {
      role: user.role || "LIE",
      assignedLga: user.assignedLga ?? "",
      assignedZone: user.assignedZone ?? "",
      assignedCluster: user.assignedCluster ?? "",
      // Carry the school a self-registering principal requested, so the admin
      // confirms (rather than silently drops) their binding on approval.
      assignedSchoolId: user.assignedSchoolId ?? "",
    },
  });
  const submitting = form.formState.isSubmitting;
  const role = form.watch("role");

  const onSubmit = async (values: ScopeSchemaType) => {
    try {
      await approveUser(user.id, values as ScopeInput);
      toast.success(`${user.firstName} approved.`);
      onDone();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't approve.");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Approve {user.firstName} {user.lastName}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <p className="text-sm text-neutral-500">
              Set the role and scope this account will have once active.
            </p>
            <RoleScopeFields role={role} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-[#0b6b3a] text-white hover:bg-[#095a31]"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Approve &amp; activate
              </Button>
            </DialogFooter>
          </form>
        </Form>
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
  const form = useForm<RejectSchemaType>({
    resolver: zodResolver(RejectSchema),
    defaultValues: { reason: "" },
  });
  const submitting = form.formState.isSubmitting;

  const onSubmit = async (values: RejectSchemaType) => {
    try {
      await rejectUser(user.id, values.reason?.trim() || undefined);
      toast.success(`${user.firstName}'s registration rejected.`);
      onDone();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't reject.");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Reject {user.firstName} {user.lastName}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <RHFTextarea
              control={form.control}
              name="reason"
              label="Reason (optional — included in the email)"
              placeholder="e.g. Could not verify your posting."
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Reject registration
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
