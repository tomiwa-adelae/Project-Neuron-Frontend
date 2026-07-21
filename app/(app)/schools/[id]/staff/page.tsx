"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Star, Trash2, UserPlus } from "lucide-react";
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
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  submitStaff,
  ApiError,
  STAFF_TYPES,
  EMPLOYMENT_TYPES,
  type StaffRecord,
  type StaffInput,
  type RegisterList,
} from "@/lib/api";
import { StaffSchema, type StaffSchemaType } from "@/lib/schemas";
import { useReferenceOptions } from "@/lib/use-reference";
import { ConfirmButton } from "../../../_components/confirm-button";
import { RegisterShell } from "../../../_components/register-shell";
import {
  RHFText,
  RHFNumber,
  RHFSelect,
  RHFDate,
  RHFSwitch,
} from "../../../_components/rhf-fields";

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
];

export default function StaffPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<RegisterList<StaffRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, startSubmit] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StaffRecord | null>(null);

  const load = () => listStaff(id).then(setData);

  useEffect(() => {
    load()
      .catch((e) =>
        toast.error(e instanceof ApiError ? e.message : "Couldn't load staff."),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmitSection = () =>
    startSubmit(async () => {
      try {
        await submitStaff(id);
        await load();
        toast.success("Staff register submitted.");
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Couldn't submit.");
      }
    });

  const onDelete = async (row: StaffRecord) => {
    try {
      await deleteStaff(id, row.id);
      await load();
      toast.success("Staff member removed.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't remove.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-[#0b6b3a]" />
      </div>
    );
  }

  const rows = data?.rows ?? [];

  return (
    <>
      <RegisterShell
        schoolId={id}
        title="Staff Register"
        subtitle="One record per staff member for the current session."
        status={data?.status ?? "NOT_STARTED"}
        hasSession={!!data?.session}
        onSubmit={onSubmitSection}
        submitting={submitting}
        submitDisabled={rows.length === 0}
        headerAction={
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="h-10 bg-[#0b6b3a] text-white hover:bg-[#095a31]"
          >
            <UserPlus className="size-4" />
            Add staff
          </Button>
        }
      >
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
            No staff recorded yet.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-50"
              >
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-sm font-medium text-neutral-900">
                    {r.lastName}, {r.firstName}
                    {r.isHeadTeacher && (
                      <span className="inline-flex items-center gap-0.5 rounded bg-[#caa44a]/20 px-1.5 py-0.5 text-[0.65rem] font-semibold text-[#7a5b08]">
                        <Star className="size-3 fill-[#caa44a] text-[#caa44a]" />
                        Head
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    {r.staffCode} · {r.staffType} · {r.qualification}
                    {r.subject ? ` · ${r.subject}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    onClick={() => {
                      setEditing(r);
                      setOpen(true);
                    }}
                    className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                    aria-label="Edit"
                  >
                    <Pencil className="size-4" />
                  </button>
                  <ConfirmButton
                    title="Remove this staff member?"
                    description={`This deletes ${r.firstName} ${r.lastName} (${r.staffCode}) from the register. This can't be undone.`}
                    confirmLabel="Remove"
                    onConfirm={() => onDelete(r)}
                  >
                    <button
                      className="rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </ConfirmButton>
                </div>
              </li>
            ))}
          </ul>
        )}
      </RegisterShell>

      {open && (
        <StaffDialog
          schoolId={id}
          editing={editing}
          onClose={() => setOpen(false)}
          onSaved={async () => {
            setOpen(false);
            await load();
          }}
        />
      )}
    </>
  );
}

function StaffDialog({
  schoolId,
  editing,
  onClose,
  onSaved,
}: {
  schoolId: string;
  editing: StaffRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useForm<StaffSchemaType>({
    resolver: zodResolver(StaffSchema),
    defaultValues: {
      staffCode: editing?.staffCode ?? "",
      firstName: editing?.firstName ?? "",
      middleName: editing?.middleName ?? "",
      lastName: editing?.lastName ?? "",
      gender: editing?.gender ?? "",
      dateOfBirth: editing?.dateOfBirth ?? "",
      phoneNumber: editing?.phoneNumber ?? "",
      staffType: editing?.staffType ?? "",
      employmentType: editing?.employmentType ?? "",
      qualification: editing?.qualification ?? "",
      subject: editing?.subject ?? "",
      dateOfFirstAppointment: editing?.dateOfFirstAppointment ?? "",
      datePostedToSchool: editing?.datePostedToSchool ?? "",
      isResidentInCommunity: editing?.isResidentInCommunity ?? false,
      yearsAtCurrentSchool: editing?.yearsAtCurrentSchool ?? undefined,
      isHeadTeacher: editing?.isHeadTeacher ?? false,
    },
  });
  const submitting = form.formState.isSubmitting;
  const { options: qualifications } = useReferenceOptions("qualifications");
  const { options: subjects } = useReferenceOptions("subjects");

  const onSubmit = async (values: StaffSchemaType) => {
    try {
      const payload = values as unknown as StaffInput;
      if (editing) await updateStaff(schoolId, editing.id, payload);
      else await createStaff(schoolId, payload);
      toast.success(editing ? "Staff updated." : "Staff added.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't save.");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit staff member" : "Add staff member"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <RHFText control={form.control} name="staffCode" label="Staff ID" required />
              <RHFSelect control={form.control} name="gender" label="Gender" required options={GENDER_OPTIONS} />
              <RHFText control={form.control} name="firstName" label="First name" required />
              <RHFText control={form.control} name="middleName" label="Middle name" />
              <RHFText control={form.control} name="lastName" label="Surname" required />
              <RHFDate control={form.control} name="dateOfBirth" label="Date of birth" />
              <RHFText control={form.control} name="phoneNumber" label="Phone number" />
              <RHFSelect control={form.control} name="staffType" label="Staff type" required options={STAFF_TYPES} />
              <RHFSelect control={form.control} name="employmentType" label="Employment type" required options={EMPLOYMENT_TYPES} />
              <RHFSelect control={form.control} name="qualification" label="Highest qualification" required options={qualifications} />
              <RHFSelect control={form.control} name="subject" label="Subject (if teaching)" options={subjects} />
              <RHFDate control={form.control} name="dateOfFirstAppointment" label="First appointment" />
              <RHFDate control={form.control} name="datePostedToSchool" label="Posted to school" />
              <RHFNumber control={form.control} name="yearsAtCurrentSchool" label="Years at this school" min={0} />
              <div className="sm:col-span-2">
                <RHFSwitch
                  control={form.control}
                  name="isResidentInCommunity"
                  label="Lives within the school community?"
                />
              </div>
              <div className="sm:col-span-2">
                <RHFSwitch
                  control={form.control}
                  name="isHeadTeacher"
                  label="Head teacher / principal? (only one per school)"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#0b6b3a] text-white hover:bg-[#095a31]">
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {editing ? "Save changes" : "Add staff"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
