"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import {
  ImagePlus,
  Loader2,
  Pencil,
  Star,
  Trash2,
  Upload,
  X,
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  listMedia,
  uploadMedia,
  updateMedia,
  deleteMedia,
  submitMedia,
  ApiError,
  MEDIA_CATEGORIES,
  type SchoolMedia,
  type RegisterList,
} from "@/lib/api";
import { RegisterShell } from "../../../_components/register-shell";
import { SelectField, ToggleField } from "../../../_components/form-fields";

const MAX_BYTES = 10 * 1024 * 1024;

export default function MediaPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<RegisterList<SchoolMedia> | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, startSubmit] = useTransition();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [editing, setEditing] = useState<SchoolMedia | null>(null);

  const load = () => listMedia(id).then(setData);

  useEffect(() => {
    load()
      .catch((e) =>
        toast.error(e instanceof ApiError ? e.message : "Couldn't load media."),
      )
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const onSubmitSection = () =>
    startSubmit(async () => {
      try {
        await submitMedia(id);
        await load();
        toast.success("Media capture submitted.");
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Couldn't submit.");
      }
    });

  const onDelete = async (m: SchoolMedia) => {
    try {
      await deleteMedia(id, m.id);
      await load();
      toast.success("Image removed.");
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
        title="Media Capture"
        subtitle="Photos of the school by category. Images only — be specific in captions."
        status={data?.status ?? "NOT_STARTED"}
        hasSession={!!data?.session}
        onSubmit={onSubmitSection}
        submitting={submitting}
        submitDisabled={rows.length === 0}
        headerAction={
          <Button
            onClick={() => setUploadOpen(true)}
            className="h-10 bg-[#0b6b3a] text-white hover:bg-[#095a31]"
          >
            <ImagePlus className="size-4" />
            Upload image
          </Button>
        }
      >
        {rows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-300 p-10 text-center text-sm text-neutral-500">
            No images uploaded yet.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {rows.map((m) => (
              <div
                key={m.id}
                className="group overflow-hidden rounded-xl border border-neutral-200 bg-white"
              >
                <div className="relative aspect-[4/3] bg-neutral-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={m.fileUrl}
                    alt={m.caption}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                  {m.isPrimary && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-0.5 rounded bg-[#caa44a] px-1.5 py-0.5 text-[0.65rem] font-bold text-[#3a2c05]">
                      <Star className="size-3 fill-[#3a2c05]" />
                      Primary
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => setEditing(m)}
                      className="rounded bg-white/90 p-1.5 text-neutral-700 hover:bg-white"
                      aria-label="Edit"
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => onDelete(m)}
                      className="rounded bg-white/90 p-1.5 text-red-600 hover:bg-white"
                      aria-label="Delete"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
                <div className="p-3">
                  <span className="rounded bg-[#0b6b3a]/10 px-1.5 py-0.5 text-[0.65rem] font-semibold text-[#0b6b3a]">
                    {m.category}
                  </span>
                  <p className="mt-1.5 line-clamp-2 text-xs text-neutral-600">
                    {m.caption}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </RegisterShell>

      {uploadOpen && (
        <UploadDialog
          schoolId={id}
          onClose={() => setUploadOpen(false)}
          onSaved={async () => {
            setUploadOpen(false);
            await load();
          }}
        />
      )}

      {editing && (
        <EditDialog
          schoolId={id}
          media={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </>
  );
}

function UploadDialog({
  schoolId,
  onClose,
  onSaved,
}: {
  schoolId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("General");
  const [caption, setCaption] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);
  const [saving, startSave] = useTransition();

  const pick = (f: File | null) => {
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast.error("Only images are allowed (no video).");
      return;
    }
    if (f.size > MAX_BYTES) {
      toast.error("Image must be 10 MB or smaller.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const save = () => {
    if (!file) return toast.error("Choose an image first.");
    if (!caption.trim()) return toast.error("A caption is required.");
    startSave(async () => {
      try {
        await uploadMedia(schoolId, { file, category, caption, isPrimary });
        toast.success("Image uploaded.");
        onSaved();
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Upload failed.");
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload image</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0] ?? null)}
          />

          {preview ? (
            <div className="relative overflow-hidden rounded-lg border border-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Preview" className="max-h-64 w-full object-contain bg-neutral-50" />
              <button
                onClick={() => {
                  setFile(null);
                  setPreview(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
                className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                aria-label="Remove"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 py-10 text-sm text-neutral-500 hover:border-[#0b6b3a]/40 hover:text-neutral-700"
            >
              <Upload className="size-6" />
              Tap to choose an image
              <span className="text-xs text-neutral-400">JPEG, PNG, WebP · max 10 MB</span>
            </button>
          )}

          <SelectField
            label="Category"
            required
            options={MEDIA_CATEGORIES}
            value={category}
            onChange={(v) => setCategory(v ?? "General")}
          />

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">
              Caption <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Describe clearly what this image shows."
              rows={3}
              className="text-sm"
            />
          </div>

          <ToggleField
            label="Set as the school's primary photo?"
            value={isPrimary}
            onChange={setIsPrimary}
          />
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
            Upload
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditDialog({
  schoolId,
  media,
  onClose,
  onSaved,
}: {
  schoolId: string;
  media: SchoolMedia;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [category, setCategory] = useState(media.category);
  const [caption, setCaption] = useState(media.caption);
  const [isPrimary, setIsPrimary] = useState(media.isPrimary);
  const [saving, startSave] = useTransition();

  const save = () => {
    if (!caption.trim()) return toast.error("A caption is required.");
    startSave(async () => {
      try {
        await updateMedia(schoolId, media.id, { category, caption, isPrimary });
        toast.success("Image updated.");
        onSaved();
      } catch (e) {
        toast.error(e instanceof ApiError ? e.message : "Couldn't update.");
      }
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit image</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border border-neutral-200">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={media.fileUrl} alt={media.caption} className="max-h-56 w-full object-contain bg-neutral-50" />
          </div>
          <SelectField
            label="Category"
            required
            options={MEDIA_CATEGORIES}
            value={category}
            onChange={(v) => setCategory(v ?? "General")}
          />
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-neutral-700">Caption</label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
              className="text-sm"
            />
          </div>
          <ToggleField
            label="Set as the school's primary photo?"
            value={isPrimary}
            onChange={setIsPrimary}
          />
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
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
