"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CalendarDays,
  CheckCircle2,
  Layers,
  Loader2,
  Lock,
  Pencil,
  Plus,
} from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  listSessions,
  createSession,
  updateSession,
  activateSession,
  listPeriods,
  createPeriod,
  updatePeriod,
  activatePeriod,
  ApiError,
  type SessionRecord,
  type CapturePeriod,
} from "@/lib/api";
import {
  SessionSchema,
  type SessionSchemaType,
  PeriodSchema,
  type PeriodSchemaType,
} from "@/lib/schemas";
import { RHFText, RHFDate, RHFNumber, RHFSwitch } from "../../_components/rhf-fields";
import { ConfirmButton } from "../../_components/confirm-button";

export default function SessionsPage() {
  const [rows, setRows] = useState<SessionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SessionRecord | null>(null);
  const [managing, setManaging] = useState<SessionRecord | null>(null);

  const load = () => listSessions().then(setRows);

  useEffect(() => {
    load()
      .catch((e) =>
        toast.error(e instanceof ApiError ? e.message : "Couldn't load sessions."),
      )
      .finally(() => setLoading(false));
  }, []);

  const onActivate = async (s: SessionRecord) => {
    try {
      await activateSession(s.id);
      await load();
      toast.success(`${s.name} is now the current session.`);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't activate.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[#0b6b3a]" />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-neutral-900">
            Academic sessions
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Capture always runs against the current session. Exactly one is
            current at a time.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setOpen(true);
          }}
          className="h-10 bg-[#0b6b3a] text-white hover:bg-[#095a31]"
        >
          <Plus className="size-4" />
          New session
        </Button>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
          No sessions yet. Create one and set it as current to enable capture.
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((s) => (
            <li
              key={s.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-white p-4",
                s.isCurrent ? "border-[#0b6b3a]/40" : "border-neutral-200",
              )}
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex size-10 items-center justify-center rounded-lg",
                    s.isCurrent
                      ? "bg-[#0b6b3a]/10 text-[#0b6b3a]"
                      : "bg-neutral-100 text-neutral-500",
                  )}
                >
                  <CalendarDays className="size-5" />
                </span>
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                    {s.name}
                    {s.isCurrent && (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-[#0b6b3a] ring-1 ring-inset ring-green-200">
                        Current
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {s.startDate ? new Date(s.startDate).toLocaleDateString() : "—"}
                    {" → "}
                    {s.endDate ? new Date(s.endDate).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => setManaging(s)}
                  className="h-9"
                >
                  <Layers className="size-4" />
                  Periods
                </Button>
                {!s.isCurrent && (
                  <Button
                    variant="outline"
                    onClick={() => onActivate(s)}
                    className="h-9"
                  >
                    <CheckCircle2 className="size-4" />
                    Set current
                  </Button>
                )}
                <button
                  onClick={() => {
                    setEditing(s);
                    setOpen(true);
                  }}
                  className="rounded p-2 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                  aria-label="Edit"
                >
                  <Pencil className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <SessionDialog
          editing={editing}
          onClose={() => setOpen(false)}
          onSaved={async () => {
            setOpen(false);
            await load();
          }}
        />
      )}

      {managing && (
        <PeriodsDialog session={managing} onClose={() => setManaging(null)} />
      )}
    </div>
  );
}

// Manage the capture rounds (periods) within a session. Activating one closes the
// currently-active period, which freezes its captured data as read-only history.
function PeriodsDialog({
  session,
  onClose,
}: {
  session: SessionRecord;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<CapturePeriod[] | null>(null);
  const [editing, setEditing] = useState<CapturePeriod | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [busy, startBusy] = useTransition();

  const load = () => listPeriods(session.id).then(setRows);

  useEffect(() => {
    load().catch((e) =>
      toast.error(e instanceof ApiError ? e.message : "Couldn't load periods."),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id]);

  const onActivate = (p: CapturePeriod) => {
    startBusy(async () => {
      try {
        await activatePeriod(p.id);
        await load();
        toast.success(`"${p.name}" is now the active capture period.`);
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Couldn't activate.");
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Capture periods — {session.name}</DialogTitle>
        </DialogHeader>

        {showForm ? (
          <PeriodForm
            sessionId={session.id}
            editing={editing}
            onCancel={() => {
              setShowForm(false);
              setEditing(null);
            }}
            onSaved={async () => {
              setShowForm(false);
              setEditing(null);
              await load();
            }}
          />
        ) : (
          <>
            <div className="space-y-2">
              {rows === null ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-5 animate-spin text-[#0b6b3a]" />
                </div>
              ) : rows.length === 0 ? (
                <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
                  No periods yet. Add the first one (e.g. &quot;Term 1&quot;) to
                  begin capture for this session.
                </p>
              ) : (
                rows.map((p) => (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center justify-between gap-3 rounded-lg border bg-white p-3",
                      p.isCurrent ? "border-[#0b6b3a]/40" : "border-neutral-200",
                    )}
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-medium text-neutral-900">
                        {p.name}
                        {p.isCurrent && (
                          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-[#0b6b3a] ring-1 ring-inset ring-green-200">
                            Active
                          </span>
                        )}
                        {p.closedAt && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                            <Lock className="size-3" /> Closed
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        Round {p.sequence}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      {!p.isCurrent && (
                        <ConfirmButton
                          title={`Activate "${p.name}"?`}
                          description="This closes the current period and starts a fresh capture round. Closed periods become read-only."
                          confirmLabel="Activate"
                          destructive={false}
                          onConfirm={() => onActivate(p)}
                        >
                          <Button
                            variant="outline"
                            disabled={busy}
                            className="h-8 text-xs"
                          >
                            Activate
                          </Button>
                        </ConfirmButton>
                      )}
                      {!p.closedAt && (
                        <button
                          onClick={() => {
                            setEditing(p);
                            setShowForm(true);
                          }}
                          className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                          aria-label="Edit period"
                        >
                          <Pencil className="size-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
            <DialogFooter className="sm:justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  setEditing(null);
                  setShowForm(true);
                }}
              >
                <Plus className="size-4" />
                Add period
              </Button>
              <Button
                onClick={onClose}
                className="bg-[#0b6b3a] text-white hover:bg-[#095a31]"
              >
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PeriodForm({
  sessionId,
  editing,
  onCancel,
  onSaved,
}: {
  sessionId: string;
  editing: CapturePeriod | null;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const form = useForm<PeriodSchemaType>({
    resolver: zodResolver(PeriodSchema),
    defaultValues: {
      name: editing?.name ?? "",
      sequence: editing?.sequence ?? undefined,
      startDate: editing?.startDate ?? "",
      endDate: editing?.endDate ?? "",
    },
  });
  const submitting = form.formState.isSubmitting;

  const onSubmit = async (values: PeriodSchemaType) => {
    const body = {
      name: values.name,
      sequence: values.sequence,
      startDate: values.startDate || null,
      endDate: values.endDate || null,
    };
    try {
      if (editing) await updatePeriod(editing.id, body);
      else await createPeriod(sessionId, body);
      toast.success(editing ? "Period updated." : "Period added.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't save period.");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <RHFText control={form.control} name="name" label="Period name" required placeholder="e.g. Term 1" />
        <RHFNumber control={form.control} name="sequence" label="Order (round number)" min={1} placeholder="e.g. 1" />
        <div className="grid grid-cols-2 gap-4">
          <RHFDate control={form.control} name="startDate" label="Start date" />
          <RHFDate control={form.control} name="endDate" label="End date" />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting} className="bg-[#0b6b3a] text-white hover:bg-[#095a31]">
            {submitting && <Loader2 className="size-4 animate-spin" />}
            {editing ? "Save period" : "Add period"}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function SessionDialog({
  editing,
  onClose,
  onSaved,
}: {
  editing: SessionRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useForm<SessionSchemaType>({
    resolver: zodResolver(SessionSchema),
    defaultValues: {
      name: editing?.name ?? "",
      startDate: editing?.startDate ?? "",
      endDate: editing?.endDate ?? "",
      isCurrent: editing?.isCurrent ?? false,
    },
  });
  const submitting = form.formState.isSubmitting;

  const onSubmit = async (values: SessionSchemaType) => {
    try {
      if (editing) {
        await updateSession(editing.id, {
          name: values.name,
          startDate: values.startDate || null,
          endDate: values.endDate || null,
        });
      } else {
        await createSession({
          name: values.name,
          startDate: values.startDate || null,
          endDate: values.endDate || null,
          isCurrent: values.isCurrent,
        });
      }
      toast.success(editing ? "Session updated." : "Session created.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't save.");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit session" : "New session"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <RHFText control={form.control} name="name" label="Session name" required placeholder="e.g. 2025/2026" />
            <div className="grid grid-cols-2 gap-4">
              <RHFDate control={form.control} name="startDate" label="Start date" />
              <RHFDate control={form.control} name="endDate" label="End date" />
            </div>
            {!editing && (
              <RHFSwitch control={form.control} name="isCurrent" label="Make this the current session?" />
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#0b6b3a] text-white hover:bg-[#095a31]">
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {editing ? "Save changes" : "Create session"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
