"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { CheckCircle2, Loader2, Pencil, Plus, XCircle } from "lucide-react";
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
  listReference,
  createReference,
  updateReference,
  ApiError,
  type ReferenceKind,
  type ReferenceRow,
} from "@/lib/api";
import { invalidateReference } from "@/lib/use-reference";
import { RHFText, RHFNumber, RHFSelect } from "../../_components/rhf-fields";

// The six dimensions, in tab order, with their manageable fields.
const KINDS: { kind: ReferenceKind; label: string; hasCode: boolean }[] = [
  { kind: "zones", label: "Zones", hasCode: true },
  { kind: "lgas", label: "LGAs", hasCode: true },
  { kind: "class-levels", label: "Class levels", hasCode: true },
  { kind: "qualifications", label: "Qualifications", hasCode: true },
  { kind: "subjects", label: "Subjects", hasCode: false },
  { kind: "media-categories", label: "Media categories", hasCode: true },
];

export default function ReferencePage() {
  const [kind, setKind] = useState<ReferenceKind>("zones");
  const [rows, setRows] = useState<ReferenceRow[]>([]);
  const [zones, setZones] = useState<ReferenceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<ReferenceRow | null | "new">(null);

  const load = (k: ReferenceKind) =>
    listReference(k, true).then(setRows);

  useEffect(() => {
    setLoading(true);
    load(kind)
      .catch((e) =>
        toast.error(e instanceof ApiError ? e.message : "Couldn't load."),
      )
      .finally(() => setLoading(false));
  }, [kind]);

  // LGAs need the zone list for their picker.
  useEffect(() => {
    listReference("zones", true).then(setZones).catch(() => {});
  }, []);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold text-neutral-900">
          Reference data
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          The lookup tables enumerators select from during capture. Edits apply to
          new captures immediately.
        </p>
        <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚠️ The Oyo State LGA→zone mapping and the subject list were seeded
          best-effort — review and correct them here.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {KINDS.map((k) => (
          <button
            key={k.kind}
            onClick={() => setKind(k.kind)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm font-medium transition-colors",
              kind === k.kind
                ? "bg-[#0b6b3a] text-white"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200",
            )}
          >
            {k.label}
          </button>
        ))}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => setEditing("new")}
          className="h-10 bg-[#0b6b3a] text-white hover:bg-[#095a31]"
        >
          <Plus className="size-4" />
          Add row
        </Button>
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-[#0b6b3a]" />
        </div>
      ) : rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
          No rows yet.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-neutral-50"
            >
              <div className="min-w-0">
                <p className="flex items-center gap-2 truncate text-sm font-medium text-neutral-900">
                  {r.name}
                  {!r.isActive && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500">
                      <XCircle className="size-3" /> Inactive
                    </span>
                  )}
                </p>
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  {r.code ? `${r.code}` : ""}
                  {r.appliesToModule ? ` · ${r.appliesToModule}` : ""}
                  {r.educationLevel ? ` · ${r.educationLevel}` : ""}
                  {r.category ? ` · ${r.category}` : ""}
                  {r.description ? ` · ${r.description}` : ""}
                </p>
              </div>
              <button
                onClick={() => setEditing(r)}
                className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                aria-label="Edit"
              >
                <Pencil className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {editing !== null && (
        <ReferenceDialog
          kind={kind}
          hasCode={KINDS.find((k) => k.kind === kind)!.hasCode}
          zones={zones}
          editing={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            invalidateReference(kind);
            await load(kind);
          }}
        />
      )}
    </div>
  );
}

const RefSchema = z.object({
  code: z.string().max(40, "40 characters max").optional(),
  name: z.string().min(1, "Name is required").max(200, "200 characters max"),
  zoneId: z.string().optional(),
  educationLevel: z.string().optional(),
  sortOrder: z.number().int().min(0).optional(),
  rank: z.number().int().min(0).optional(),
  category: z.string().optional(),
  appliesToModule: z.string().optional(),
  mediaTypeAllowed: z.string().optional(),
  maxFilesAllowed: z.number().int().min(0).optional(),
  description: z.string().max(500, "500 characters max").optional(),
  isActive: z.boolean().optional(),
});
type RefForm = z.infer<typeof RefSchema>;

function ReferenceDialog({
  kind,
  hasCode,
  zones,
  editing,
  onClose,
  onSaved,
}: {
  kind: ReferenceKind;
  hasCode: boolean;
  zones: ReferenceRow[];
  editing: ReferenceRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useForm<RefForm>({
    resolver: zodResolver(RefSchema),
    defaultValues: {
      code: editing?.code ?? "",
      name: editing?.name ?? "",
      zoneId: editing?.zoneId ?? "",
      educationLevel: editing?.educationLevel ?? "",
      sortOrder: editing?.sortOrder ?? undefined,
      rank: editing?.rank ?? undefined,
      category: editing?.category ?? "",
      appliesToModule: editing?.appliesToModule ?? "",
      mediaTypeAllowed: editing?.mediaTypeAllowed ?? "image",
      maxFilesAllowed: editing?.maxFilesAllowed ?? undefined,
      description: editing?.description ?? "",
    },
  });
  const submitting = form.formState.isSubmitting;

  const onSubmit = async (values: RefForm) => {
    try {
      if (editing) await updateReference(kind, editing.id, values);
      else await createReference(kind, values);
      toast.success(editing ? "Updated." : "Added.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't save.");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit row" : "Add row"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {hasCode && (
              <RHFText control={form.control} name="code" label="Code" required />
            )}
            <RHFText control={form.control} name="name" label="Name" required />

            {kind === "lgas" && (
              <RHFSelect
                control={form.control}
                name="zoneId"
                label="Zone"
                options={zones.map((z) => ({ value: z.id, label: z.name }))}
              />
            )}
            {kind === "class-levels" && (
              <>
                <RHFText control={form.control} name="educationLevel" label="Education level" />
                <RHFNumber control={form.control} name="sortOrder" label="Sort order" min={0} />
              </>
            )}
            {kind === "qualifications" && (
              <RHFNumber control={form.control} name="rank" label="Rank" min={0} />
            )}
            {kind === "subjects" && (
              <RHFText control={form.control} name="category" label="Category" />
            )}
            {kind === "media-categories" && (
              <>
                <RHFText control={form.control} name="appliesToModule" label="Applies to module" />
                <RHFSelect
                  control={form.control}
                  name="mediaTypeAllowed"
                  label="Media type allowed"
                  options={["image", "video", "both"]}
                />
                <RHFNumber control={form.control} name="maxFilesAllowed" label="Max files" min={0} />
                <RHFText control={form.control} name="description" label="Description / instructions" />
              </>
            )}

            {editing && (
              <label className="flex items-center justify-between gap-3 rounded-md border border-input px-3 py-2 text-sm">
                <span className="text-neutral-700">Active</span>
                <input
                  type="checkbox"
                  defaultChecked={editing.isActive}
                  onChange={(e) => form.setValue("isActive", e.target.checked)}
                  className="size-4 accent-[#0b6b3a]"
                />
              </label>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#0b6b3a] text-white hover:bg-[#095a31]">
                {submitting ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                {editing ? "Save" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
