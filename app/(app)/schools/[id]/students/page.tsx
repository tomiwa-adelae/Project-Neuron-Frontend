"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
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
import {
  listStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  submitStudents,
  ApiError,
  CLASS_LEVELS,
  ENROLMENT_TYPES,
  TRANSPORT_MODES,
  EXIT_REASONS,
  NIGERIAN_STATES,
  type StudentRecord,
  type StudentInput,
  type RegisterList,
} from "@/lib/api";
import { RegisterShell } from "../../../_components/register-shell";
import {
  TextField,
  NumberField,
  SelectField,
  DateField,
  ToggleField,
  GenderField,
} from "../../../_components/form-fields";

const EMPTY: StudentInput = {
  studentCode: "",
  classLevel: "",
  firstName: "",
  lastName: "",
  gender: "MALE",
  enrolmentType: "",
  enrolmentDate: "",
  disabilityStatus: false,
};

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
  const [form, setForm] = useState<StudentInput>(
    editing ? { ...(editing as StudentInput) } : EMPTY,
  );
  const [saving, startSave] = useTransition();
  const set = (p: Partial<StudentInput>) => setForm((f) => ({ ...f, ...p }));

  const save = () => {
    const required: [keyof StudentInput, string][] = [
      ["studentCode", "Student ID"],
      ["classLevel", "Class"],
      ["firstName", "First name"],
      ["lastName", "Surname"],
      ["enrolmentType", "Enrolment type"],
      ["enrolmentDate", "Enrolment date"],
    ];
    for (const [k, label] of required) {
      if (!form[k]) return toast.error(`${label} is required.`);
    }
    startSave(async () => {
      try {
        if (editing) await updateStudent(schoolId, editing.id, form);
        else await createStudent(schoolId, form);
        toast.success(editing ? "Student updated." : "Student added.");
        onSaved();
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Couldn't save.");
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit student" : "Add student"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Student ID" required value={form.studentCode} onChange={(v) => set({ studentCode: v ?? "" })} />
          <SelectField label="Class" required options={CLASS_LEVELS} value={form.classLevel} onChange={(v) => set({ classLevel: v ?? "" })} />
          <TextField label="First name" required value={form.firstName} onChange={(v) => set({ firstName: v ?? "" })} />
          <TextField label="Middle name" value={form.middleName} onChange={(v) => set({ middleName: v })} />
          <TextField label="Surname" required value={form.lastName} onChange={(v) => set({ lastName: v ?? "" })} />
          <GenderField required value={form.gender} onChange={(v) => set({ gender: v })} />
          <DateField label="Date of birth" value={form.dateOfBirth} onChange={(v) => set({ dateOfBirth: v })} />
          <SelectField label="Enrolment type" required options={ENROLMENT_TYPES} value={form.enrolmentType} onChange={(v) => set({ enrolmentType: v ?? "" })} />
          <DateField label="Enrolment date" required value={form.enrolmentDate} onChange={(v) => set({ enrolmentDate: v ?? "" })} />
          <SelectField label="State of origin" options={NIGERIAN_STATES} value={form.stateOfOrigin} onChange={(v) => set({ stateOfOrigin: v })} />
          <TextField label="LGA of origin" value={form.lgaOfOrigin} onChange={(v) => set({ lgaOfOrigin: v })} />
          <NumberField label="Distance to school" unit="km" min={0} value={form.distanceToSchoolKm} onChange={(v) => set({ distanceToSchoolKm: v })} />
          <SelectField label="Transport mode" options={TRANSPORT_MODES} value={form.transportMode} onChange={(v) => set({ transportMode: v })} />
          <TextField label="Guardian name" value={form.guardianName} onChange={(v) => set({ guardianName: v })} />
          <TextField label="Guardian phone" value={form.guardianPhone} onChange={(v) => set({ guardianPhone: v })} />
          <div className="sm:col-span-2">
            <ToggleField
              label="Does this student have a disability?"
              value={form.disabilityStatus}
              onChange={(v) => set({ disabilityStatus: v, disabilityType: v ? form.disabilityType : null })}
            />
          </div>
          {form.disabilityStatus && (
            <TextField label="Disability type" value={form.disabilityType} onChange={(v) => set({ disabilityType: v })} />
          )}
          <DateField label="Exit date (if left)" value={form.exitDate} onChange={(v) => set({ exitDate: v })} />
          <SelectField label="Exit reason" options={EXIT_REASONS} value={form.exitReason} onChange={(v) => set({ exitReason: v })} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="bg-[#0b6b3a] text-white hover:bg-[#095a31]">
            {saving && <Loader2 className="size-4 animate-spin" />}
            {editing ? "Save changes" : "Add student"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
