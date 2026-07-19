"use client";

import { useEffect, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
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
  listAsc,
  createAsc,
  updateAsc,
  deleteAsc,
  submitAsc,
  ApiError,
  type AscRecord,
  type AscInput,
  type RegisterList,
} from "@/lib/api";
import { AscSchema, type AscSchemaType } from "@/lib/schemas";
import { useReferenceOptions } from "@/lib/use-reference";
import { RegisterShell } from "../../../_components/register-shell";
import { RHFNumber, RHFSelect } from "../../../_components/rhf-fields";

const GENDER_OPTIONS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
];

export default function AscPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<RegisterList<AscRecord> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, startSubmit] = useTransition();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AscRecord | null>(null);

  const load = () => listAsc(id).then(setData);

  useEffect(() => {
    load()
      .catch((e) =>
        toast.error(e instanceof ApiError ? e.message : "Couldn't load census."),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmitSection = () =>
    startSubmit(async () => {
      try {
        await submitAsc(id);
        await load();
        toast.success("Annual School Census submitted.");
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Couldn't submit.");
      }
    });

  const onDelete = async (row: AscRecord) => {
    try {
      await deleteAsc(id, row.id);
      await load();
      toast.success("Row removed.");
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
  const totalEnrol = rows.reduce((a, r) => a + r.enrolmentCount, 0);

  return (
    <>
      <RegisterShell
        schoolId={id}
        title="Annual School Census"
        subtitle="Enrolment by class and gender for the current session."
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
            <Plus className="size-4" />
            Add class row
          </Button>
        }
      >
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500">
            No enrolment rows yet. Add one row per class per gender.
          </p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs text-neutral-500">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Class</th>
                  <th className="px-4 py-2.5 font-medium">Gender</th>
                  <th className="px-4 py-2.5 text-right font-medium">Enrolled</th>
                  <th className="px-4 py-2.5 text-right font-medium">New</th>
                  <th className="px-4 py-2.5 text-right font-medium">Repeat</th>
                  <th className="px-4 py-2.5 text-right font-medium">Dropout</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-neutral-50">
                    <td className="px-4 py-2.5 font-medium text-neutral-900">{r.classLevel}</td>
                    <td className="px-4 py-2.5 text-neutral-600">
                      {r.gender === "MALE" ? "Male" : "Female"}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.enrolmentCount}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.newEntrants}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.repeaters}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{r.dropoutCount}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex justify-end gap-1">
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
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-neutral-50 text-xs">
                <tr>
                  <td className="px-4 py-2.5 font-medium text-neutral-600" colSpan={2}>
                    {rows.length} rows
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-neutral-900 tabular-nums">
                    {totalEnrol}
                  </td>
                  <td colSpan={4}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </RegisterShell>

      {open && (
        <AscDialog
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

function AscDialog({
  schoolId,
  editing,
  onClose,
  onSaved,
}: {
  schoolId: string;
  editing: AscRecord | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useForm<AscSchemaType>({
    resolver: zodResolver(AscSchema),
    defaultValues: {
      classLevel: editing?.classLevel ?? "",
      gender: editing?.gender ?? "",
      enrolmentCount: editing?.enrolmentCount ?? 0,
      newEntrants: editing?.newEntrants ?? 0,
      repeaters: editing?.repeaters ?? 0,
      dropoutCount: editing?.dropoutCount ?? 0,
    },
  });
  const submitting = form.formState.isSubmitting;
  const { options: classLevels } = useReferenceOptions("class-levels");

  const onSubmit = async (values: AscSchemaType) => {
    try {
      const payload = values as unknown as AscInput;
      if (editing) await updateAsc(schoolId, editing.id, payload);
      else await createAsc(schoolId, payload);
      toast.success(editing ? "Row updated." : "Row added.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't save.");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit class row" : "Add class row"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <RHFSelect control={form.control} name="classLevel" label="Class" required options={classLevels} />
              <RHFSelect control={form.control} name="gender" label="Gender" required options={GENDER_OPTIONS} />
              <RHFNumber control={form.control} name="enrolmentCount" label="Enrolment count" required min={0} />
              <RHFNumber control={form.control} name="newEntrants" label="New entrants" required min={0} />
              <RHFNumber control={form.control} name="repeaters" label="Repeaters" required min={0} />
              <RHFNumber control={form.control} name="dropoutCount" label="Dropouts" required min={0} />
            </div>
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
                {editing ? "Save changes" : "Add row"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
