"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { Form } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import {
  listMedia,
  uploadMedia,
  updateMedia,
  deleteMedia,
  submitMedia,
  ApiError,
  type SchoolMedia,
  type RegisterList,
} from "@/lib/api";
import { MediaMetaSchema, type MediaMetaSchemaType } from "@/lib/schemas";
import { useReferenceOptions } from "@/lib/use-reference";
import { RegisterShell } from "../../../_components/register-shell";
import { RHFSelect, RHFTextarea, RHFSwitch } from "../../../_components/rhf-fields";

const MAX_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;

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
                  {m.mediaType === "video" ? (
                    <video
                      src={m.fileUrl}
                      controls
                      preload="metadata"
                      className="h-full w-full bg-black object-contain"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.fileUrl}
                      alt={m.caption}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                  {m.isPrimary && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-0.5 rounded bg-[#caa44a] px-1.5 py-0.5 text-[0.65rem] font-bold text-[#3a2c05]">
                      <Star className="size-3 fill-[#3a2c05]" />
                      Primary
                    </span>
                  )}
                  {m.isFlagged && (
                    <span
                      className="absolute left-2 bottom-2 inline-flex items-center rounded bg-red-600 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white"
                      title={m.flagReason ?? "Flagged for review"}
                    >
                      Flagged
                    </span>
                  )}
                  {m.mediaType === "video" && (
                    <span className="absolute right-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[0.65rem] font-semibold text-white">
                      {m.videoDurationSecs != null
                        ? `${Math.floor(m.videoDurationSecs / 60)}:${String(
                            m.videoDurationSecs % 60,
                          ).padStart(2, "0")}`
                        : "Video"}
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

  const form = useForm<MediaMetaSchemaType>({
    resolver: zodResolver(MediaMetaSchema),
    defaultValues: { category: "General", caption: "", isPrimary: false },
  });
  const submitting = form.formState.isSubmitting;
  const { options: categories } = useReferenceOptions("media-categories");

  const isVideo = !!file && file.type.startsWith("video/");

  const pick = (f: File | null) => {
    if (!f) return;
    const image = f.type.startsWith("image/");
    const video = f.type.startsWith("video/");
    if (!image && !video) {
      toast.error("Only images or video are allowed.");
      return;
    }
    const cap = video ? MAX_VIDEO_BYTES : MAX_BYTES;
    if (f.size > cap) {
      toast.error(`File must be ${video ? "100" : "10"} MB or smaller.`);
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const onSubmit = async (values: MediaMetaSchemaType) => {
    if (!file) {
      toast.error("Choose an image or video first.");
      return;
    }
    try {
      await uploadMedia(schoolId, {
        file,
        category: values.category,
        caption: values.caption,
        isPrimary: values.isPrimary ?? false,
      });
      toast.success(isVideo ? "Video uploaded." : "Image uploaded.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Upload failed.");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Upload media</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => pick(e.target.files?.[0] ?? null)}
            />

            {preview ? (
              <div className="relative overflow-hidden rounded-lg border border-neutral-200">
                {isVideo ? (
                  <video src={preview} controls className="max-h-64 w-full bg-black object-contain" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={preview} alt="Preview" className="max-h-64 w-full object-contain bg-neutral-50" />
                )}
                <button
                  type="button"
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
                type="button"
                onClick={() => inputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 py-10 text-sm text-neutral-500 hover:border-[#0b6b3a]/40 hover:text-neutral-700"
              >
                <Upload className="size-6" />
                Tap to choose an image or video
                <span className="text-xs text-neutral-400">
                  Image (JPEG/PNG/WebP · 10 MB) or video (MP4/WebM/MOV · 100 MB)
                </span>
              </button>
            )}

            <RHFSelect control={form.control} name="category" label="Category" required options={categories} />
            <RHFTextarea
              control={form.control}
              name="caption"
              label="Caption"
              required
              placeholder="Describe clearly what this image shows."
            />
            <RHFSwitch control={form.control} name="isPrimary" label="Set as the school's primary photo?" />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#0b6b3a] text-white hover:bg-[#095a31]">
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Upload
              </Button>
            </DialogFooter>
          </form>
        </Form>
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
  const form = useForm<MediaMetaSchemaType>({
    resolver: zodResolver(MediaMetaSchema),
    defaultValues: {
      category: media.category,
      caption: media.caption,
      isPrimary: media.isPrimary,
    },
  });
  const submitting = form.formState.isSubmitting;
  const { options: categories } = useReferenceOptions("media-categories");

  const onSubmit = async (values: MediaMetaSchemaType) => {
    try {
      await updateMedia(schoolId, media.id, {
        category: values.category,
        caption: values.caption,
        isPrimary: values.isPrimary ?? false,
      });
      toast.success("Image updated.");
      onSaved();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't update.");
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit image</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="overflow-hidden rounded-lg border border-neutral-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={media.fileUrl} alt={media.caption} className="max-h-56 w-full object-contain bg-neutral-50" />
            </div>
            <RHFSelect control={form.control} name="category" label="Category" required options={categories} />
            <RHFTextarea control={form.control} name="caption" label="Caption" required />
            <RHFSwitch control={form.control} name="isPrimary" label="Set as the school's primary photo?" />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting} className="bg-[#0b6b3a] text-white hover:bg-[#095a31]">
                {submitting && <Loader2 className="size-4 animate-spin" />}
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
