"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
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
import {
  listStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  submitStaff,
  ApiError,
  STAFF_TYPES,
  EMPLOYMENT_TYPES,
  QUALIFICATIONS,
  type StaffRecord,
  type StaffInput,
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

const EMPTY: StaffInput = {
  staffCode: "",
  firstName: "",
  lastName: "",
  gender: "MALE",
  staffType: "",
  employmentType: "",
  qualification: "",
  isResidentInCommunity: false,
  isHeadTeacher: false,
};

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
  const [form, setForm] = useState<StaffInput>(
    editing ? { ...(editing as StaffInput) } : EMPTY,
  );
  const [saving, startSave] = useTransition();
  const set = (p: Partial<StaffInput>) => setForm((f) => ({ ...f, ...p }));

  const save = () => {
    const required: [keyof StaffInput, string][] = [
      ["staffCode", "Staff ID"],
      ["firstName", "First name"],
      ["lastName", "Surname"],
      ["staffType", "Staff type"],
      ["employmentType", "Employment type"],
      ["qualification", "Qualification"],
    ];
    for (const [k, label] of required) {
      if (!form[k]) return toast.error(`${label} is required.`);
    }
    startSave(async () => {
      try {
        if (editing) await updateStaff(schoolId, editing.id, form);
        else await createStaff(schoolId, form);
        toast.success(editing ? "Staff updated." : "Staff added.");
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
          <DialogTitle>{editing ? "Edit staff member" : "Add staff member"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField label="Staff ID" required value={form.staffCode} onChange={(v) => set({ staffCode: v ?? "" })} />
          <GenderField required value={form.gender} onChange={(v) => set({ gender: v })} />
          <TextField label="First name" required value={form.firstName} onChange={(v) => set({ firstName: v ?? "" })} />
          <TextField label="Middle name" value={form.middleName} onChange={(v) => set({ middleName: v })} />
          <TextField label="Surname" required value={form.lastName} onChange={(v) => set({ lastName: v ?? "" })} />
          <DateField label="Date of birth" value={form.dateOfBirth} onChange={(v) => set({ dateOfBirth: v })} />
          <TextField label="Phone number" value={form.phoneNumber} onChange={(v) => set({ phoneNumber: v })} />
          <SelectField label="Staff type" required options={STAFF_TYPES} value={form.staffType} onChange={(v) => set({ staffType: v ?? "" })} />
          <SelectField label="Employment type" required options={EMPLOYMENT_TYPES} value={form.employmentType} onChange={(v) => set({ employmentType: v ?? "" })} />
          <SelectField label="Highest qualification" required options={QUALIFICATIONS} value={form.qualification} onChange={(v) => set({ qualification: v ?? "" })} />
          <TextField label="Subject (if teaching)" value={form.subject} onChange={(v) => set({ subject: v })} />
          <DateField label="First appointment" value={form.dateOfFirstAppointment} onChange={(v) => set({ dateOfFirstAppointment: v })} />
          <DateField label="Posted to school" value={form.datePostedToSchool} onChange={(v) => set({ datePostedToSchool: v })} />
          <NumberField label="Years at this school" min={0} value={form.yearsAtCurrentSchool} onChange={(v) => set({ yearsAtCurrentSchool: v })} />
          <div className="sm:col-span-2">
            <ToggleField
              label="Lives within the school community?"
              value={form.isResidentInCommunity}
              onChange={(v) => set({ isResidentInCommunity: v })}
            />
          </div>
          <div className="sm:col-span-2">
            <ToggleField
              label="Head teacher / principal? (only one per school)"
              value={form.isHeadTeacher}
              onChange={(v) => set({ isHeadTeacher: v })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={save} disabled={saving} className="bg-[#0b6b3a] text-white hover:bg-[#095a31]">
            {saving && <Loader2 className="size-4 animate-spin" />}
            {editing ? "Save changes" : "Add staff"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
