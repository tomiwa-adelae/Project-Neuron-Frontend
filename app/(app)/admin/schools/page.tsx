"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Loader2,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Search,
  Upload,
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
import { Input } from "@/components/ui/input";
import { Form } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import {
  listRegistrySchools,
  createSchool,
  updateSchool,
  setSchoolActive,
  importSchools,
  SCHOOL_TYPE_OPTIONS,
  OWNERSHIP_OPTIONS,
  CATEGORY_OPTIONS,
  GENDER_CATEGORY_OPTIONS,
  ApiError,
  type SchoolMaster,
  type SchoolInput,
} from "@/lib/api";
import { SchoolSchema, type SchoolSchemaType } from "@/lib/schemas";
import { useReferenceOptions } from "@/lib/use-reference";
import { RHFText, RHFNumber, RHFSelect } from "../../_components/rhf-fields";

const TYPE_LABEL = Object.fromEntries(
  SCHOOL_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

export default function SchoolRegistryPage() {
  const [rows, setRows] = useState<SchoolMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolMaster | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const load = () =>
    listRegistrySchools({ active: active || undefined }).then(setRows);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((e) =>
        toast.error(e instanceof ApiError ? e.message : "Couldn't load registry."),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        s.code.toLowerCase().includes(needle) ||
        s.lgaName.toLowerCase().includes(needle),
    );
  }, [rows, q]);

  const toggleActive = async (s: SchoolMaster) => {
    try {
      await setSchoolActive(s.id, !s.isActive);
      await load();
      toast.success(s.isActive ? "School deactivated." : "School activated.");
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't update.");
    }
  };

  const SELECT =
    "h-10 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0b6b3a]/20";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold text-neutral-900">
            School registry
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            The master list inspectors capture against. {rows.length} school
            {rows.length === 1 ? "" : "s"}.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            className="h-10"
          >
            <Upload className="size-4" />
            Import CSV
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setOpen(true);
            }}
            className="h-10 bg-[#0b6b3a] text-white hover:bg-[#095a31]"
          >
            <Plus className="size-4" />
            Add school
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, code or LGA"
            className="h-10 pl-9 text-sm"
          />
        </div>
        <select value={active} onChange={(e) => setActive(e.target.value)} className={SELECT}>
          <option value="">All</option>
          <option value="true">Active only</option>
          <option value="false">Inactive only</option>
        </select>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-[#0b6b3a]" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
          No schools match.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
          {filtered.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className={cn("truncate text-sm font-medium", s.isActive ? "text-neutral-900" : "text-neutral-400")}>
                  {s.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-neutral-500">
                  {s.code} · {TYPE_LABEL[s.type] ?? s.type} · {s.lgaName}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!s.isActive && (
                  <span className="mr-1 rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-500">
                    Inactive
                  </span>
                )}
                <button
                  onClick={() => {
                    setEditing(s);
                    setOpen(true);
                  }}
                  className="rounded p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
                  aria-label="Edit"
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  onClick={() => toggleActive(s)}
                  className={cn(
                    "rounded p-1.5",
                    s.isActive
                      ? "text-neutral-400 hover:bg-amber-50 hover:text-amber-600"
                      : "text-neutral-400 hover:bg-green-50 hover:text-[#0b6b3a]",
                  )}
                  aria-label={s.isActive ? "Deactivate" : "Activate"}
                >
                  {s.isActive ? <PowerOff className="size-4" /> : <Power className="size-4" />}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {open && (
        <SchoolDialog
          editing={editing}
          onClose={() => setOpen(false)}
          onSaved={async () => {
            setOpen(false);
            await load();
          }}
        />
      )}
      {importOpen && (
        <ImportDialog
          onClose={() => setImportOpen(false)}
          onDone={async () => {
            setImportOpen(false);
            await load();
          }}
        />
      )}
    </div>
  );
}

function SchoolDialog({
  editing,
  onClose,
  onSaved,
}: {
  editing: SchoolMaster | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const form = useForm<SchoolSchemaType>({
    resolver: zodResolver(SchoolSchema),
    defaultValues: {
      code: editing?.code ?? "",
      name: editing?.name ?? "",
      type: editing?.type ?? "PRIMARY",
      ownership: editing?.ownership ?? "PUBLIC",
      category: editing?.category ?? "DAY",
      genderCategory: editing?.genderCategory ?? "MIXED",
      lgaName: editing?.lgaName ?? "",
      lgaCode: editing?.lgaCode ?? "",
      zoneName: editing?.zoneName ?? "",
      cluster: editing?.cluster ?? "",
      ward: editing?.ward ?? "",
      community: editing?.community ?? "",
      address: editing?.address ?? "",
      latitude: editing?.latitude ?? undefined,
      longitude: editing?.longitude ?? undefined,
      dateEstablished: editing?.dateEstablished ?? undefined,
    },
  });
  const submitting = form.formState.isSubmitting;
  const { options: lgaOptions } = useReferenceOptions("lgas");

  const onSubmit = async (values: SchoolSchemaType) => {
    try {
      const payload = values as unknown as SchoolInput;
      if (editing) await updateSchool(editing.id, payload);
      else await createSchool(payload);
      toast.success(editing ? "School updated." : "School added.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't save.");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit school" : "Add school"}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <RHFText control={form.control} name="code" label="School code" required />
              <RHFText control={form.control} name="name" label="Name" required />
              <RHFSelect control={form.control} name="type" label="Level" required options={SCHOOL_TYPE_OPTIONS} />
              <RHFSelect control={form.control} name="ownership" label="Ownership" required options={OWNERSHIP_OPTIONS} />
              <RHFSelect control={form.control} name="category" label="Boarding" required options={CATEGORY_OPTIONS} />
              <RHFSelect control={form.control} name="genderCategory" label="Students served" required options={GENDER_CATEGORY_OPTIONS} />
              <RHFSelect control={form.control} name="lgaName" label="LGA" required options={lgaOptions} />
              <RHFText control={form.control} name="lgaCode" label="LGA code" />
              <RHFText control={form.control} name="zoneName" label="Zone (auto from LGA)" />
              <RHFText control={form.control} name="cluster" label="Inspectorate cluster" />
              <RHFText control={form.control} name="ward" label="Ward" />
              <RHFText control={form.control} name="community" label="Community" />
              <RHFText control={form.control} name="address" label="Address" />
              <RHFNumber control={form.control} name="latitude" label="Latitude" step={0.0001} />
              <RHFNumber control={form.control} name="longitude" label="Longitude" step={0.0001} />
              <RHFNumber control={form.control} name="dateEstablished" label="Year established" />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#0b6b3a] text-white hover:bg-[#095a31]">
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {editing ? "Save changes" : "Add school"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// Minimal CSV parser handling double-quoted fields.
function parseCsv(text: string): Record<string, string>[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((l) => l.trim().length);
  if (lines.length < 2) return [];
  const parseLine = (line: string) => {
    const out: string[] = [];
    let cur = "";
    let inQ = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (inQ) {
        if (c === '"') {
          if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
        } else cur += c;
      } else if (c === ",") { out.push(cur); cur = ""; }
      else if (c === '"') inQ = true;
      else cur += c;
    }
    out.push(cur);
    return out;
  };
  const headers = parseLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = parseLine(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h] = (cells[i] ?? "").trim()));
    return obj;
  });
}

const NUM = (v?: string) => {
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
};

function ImportDialog({
  onClose,
  onDone,
}: {
  onClose: () => void;
  onDone: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<SchoolInput[] | null>(null);
  const [fileName, setFileName] = useState("");
  const [saving, startSave] = useTransition();

  const onFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    try {
      const text = await file.text();
      const rows = parseCsv(text);
      const mapped: SchoolInput[] = rows.map((r) => ({
        code: r.code,
        name: r.name,
        type: r.type,
        ownership: r.ownership,
        category: r.category,
        genderCategory: r.genderCategory,
        lgaName: r.lgaName,
        lgaCode: r.lgaCode || undefined,
        zoneName: r.zoneName || undefined,
        cluster: r.cluster || undefined,
        ward: r.ward || undefined,
        community: r.community || undefined,
        address: r.address || undefined,
        latitude: NUM(r.latitude),
        longitude: NUM(r.longitude),
      }));
      if (mapped.length === 0) {
        toast.error("No data rows found in the CSV.");
        return;
      }
      setParsed(mapped);
    } catch {
      toast.error("Couldn't read the file.");
    }
  };

  const run = () => {
    if (!parsed) return;
    startSave(async () => {
      try {
        const res = await importSchools(parsed);
        toast.success(`Imported: ${res.created} new, ${res.updated} updated.`);
        onDone();
      } catch (e) {
        toast.error(
          e instanceof ApiError ? e.message : "Import failed — check your CSV.",
        );
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import schools from CSV</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-neutral-600">
            Header row required. Columns:
          </p>
          <code className="block overflow-x-auto rounded-md bg-neutral-50 p-2 text-[0.7rem] text-neutral-600">
            code,name,type,ownership,category,genderCategory,lgaName,lgaCode,zoneName,cluster,ward,community,address,latitude,longitude
          </code>
          <p className="text-xs text-neutral-500">
            <strong>type</strong>: PRIMARY · JSS · SSS · COMBINED_PRY_JSS ·
            COMBINED_JSS_SSS · COMBINED_PRY_SSS. <strong>ownership</strong>:
            PUBLIC · MISSION · PRIVATE. <strong>category</strong>: DAY · BOARDING
            · SEMI_BOARDING. <strong>genderCategory</strong>: MIXED · BOYS_ONLY ·
            GIRLS_ONLY. Existing codes are updated.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 py-8 text-sm text-neutral-500 hover:border-[#0b6b3a]/40 hover:text-neutral-700"
          >
            <Upload className="size-6" />
            {fileName || "Choose a .csv file"}
          </button>

          {parsed && (
            <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-[#0b6b3a]">
              {parsed.length} row{parsed.length === 1 ? "" : "s"} ready to import.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={run}
            disabled={saving || !parsed}
            className="bg-[#0b6b3a] text-white hover:bg-[#095a31]"
          >
            {saving && <Loader2 className="size-4 animate-spin" />}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
