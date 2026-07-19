"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus, Trash2, UserPlus } from "lucide-react";
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
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  submitStudents,
  ApiError,
  ENROLMENT_TYPES,
  TRANSPORT_MODES,
  EXIT_REASONS,
  NIGERIAN_STATES,
  type StudentRecord,
  type StudentInput,
  type RegisterList,
} from "@/lib/api";
import { StudentSchema, type StudentSchemaType } from "@/lib/schemas";
import { useReferenceOptions } from "@/lib/use-reference";
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

export default function StudentsPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<RegisterList<StudentRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, startSubmit] = useTransition();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRecord | null>(null);

  const load = () => listStudents(id).then(setData);

  useEffect(() => {
    load()
      .catch((e) =>
        toast.error(e instanceof ApiError ? e.message : "Couldn't load students."),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmitSection = () =>
    startSubmit(async () => {
      try {
        await submitStudents(id);
        await load();
        toast.success("Student register submitted.");
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Couldn't submit.");
      }
    });

  const onDelete = async (row: StudentRecord) => {
    try {
      await deleteStudent(id, row.id);
      await load();
      toast.success("Student removed.");
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
        title="Student Register"
        subtitle="One record per enrolled student for the current session."
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
            Add student
          </Button>
        }
      >
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
            No students recorded yet.
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
            {rows.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-50"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-neutral-900">
                    {r.lastName}, {r.firstName} {r.middleName ?? ""}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-neutral-500">
                    {r.studentCode} · {r.classLevel} ·{" "}
                    {r.gender === "MALE" ? "M" : "F"}
                    {r.disabilityStatus ? " · Disability" : ""}
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
                  <button
                    onClick={() => onDelete(r)}
                    className="rounded p-1.5 text-neutral-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Delete"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </RegisterShell>

      {open && (
        <StudentDialog
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

function StudentDialog({
  schoolId,
  editing,
  onClose,
  onSaved,
}: {
  schoolId: string;
  editing: StudentRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useForm<StudentSchemaType>({
    resolver: zodResolver(StudentSchema),
    defaultValues: {
      studentCode: editing?.studentCode ?? "",
      classLevel: editing?.classLevel ?? "",
      firstName: editing?.firstName ?? "",
      middleName: editing?.middleName ?? "",
      lastName: editing?.lastName ?? "",
      dateOfBirth: editing?.dateOfBirth ?? "",
      gender: editing?.gender ?? "",
      stateOfOrigin: editing?.stateOfOrigin ?? "",
      lgaOfOrigin: editing?.lgaOfOrigin ?? "",
      disabilityStatus: editing?.disabilityStatus ?? false,
      disabilityType: editing?.disabilityType ?? "",
      enrolmentType: editing?.enrolmentType ?? "",
      distanceToSchoolKm: editing?.distanceToSchoolKm ?? undefined,
      transportMode: editing?.transportMode ?? "",
      guardianName: editing?.guardianName ?? "",
      guardianPhone: editing?.guardianPhone ?? "",
      enrolmentDate: editing?.enrolmentDate ?? "",
      exitDate: editing?.exitDate ?? "",
      exitReason: editing?.exitReason ?? "",
    },
  });
  const submitting = form.formState.isSubmitting;
  const hasDisability = form.watch("disabilityStatus");
  const { options: classLevels } = useReferenceOptions("class-levels");

  const onSubmit = async (values: StudentSchemaType) => {
    try {
      const payload = values as unknown as StudentInput;
      if (editing) await updateStudent(schoolId, editing.id, payload);
      else await createStudent(schoolId, payload);
      toast.success(editing ? "Student updated." : "Student added.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't save.");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit student" : "Add student"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <RHFText control={form.control} name="studentCode" label="Student ID" required />
              <RHFSelect control={form.control} name="classLevel" label="Class" required options={classLevels} />
              <RHFText control={form.control} name="firstName" label="First name" required />
              <RHFText control={form.control} name="middleName" label="Middle name" />
              <RHFText control={form.control} name="lastName" label="Surname" required />
              <RHFSelect control={form.control} name="gender" label="Gender" required options={GENDER_OPTIONS} />
              <RHFDate control={form.control} name="dateOfBirth" label="Date of birth" />
              <RHFSelect control={form.control} name="enrolmentType" label="Enrolment type" required options={ENROLMENT_TYPES} />
              <RHFDate control={form.control} name="enrolmentDate" label="Enrolment date" required />
              <RHFSelect control={form.control} name="stateOfOrigin" label="State of origin" options={NIGERIAN_STATES} />
              <RHFText control={form.control} name="lgaOfOrigin" label="LGA of origin" />
              <RHFNumber control={form.control} name="distanceToSchoolKm" label="Distance to school" unit="km" min={0} />
              <RHFSelect control={form.control} name="transportMode" label="Transport mode" options={TRANSPORT_MODES} />
              <RHFText control={form.control} name="guardianName" label="Guardian name" />
              <RHFText control={form.control} name="guardianPhone" label="Guardian phone" />
              <div className="sm:col-span-2">
                <RHFSwitch
                  control={form.control}
                  name="disabilityStatus"
                  label="Does this student have a disability?"
                />
              </div>
              {hasDisability && (
                <RHFText control={form.control} name="disabilityType" label="Disability type" />
              )}
              <RHFDate control={form.control} name="exitDate" label="Exit date (if left)" />
              <RHFSelect control={form.control} name="exitReason" label="Exit reason" options={EXIT_REASONS} />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#0b6b3a] text-white hover:bg-[#095a31]">
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {editing ? "Save changes" : "Add student"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
