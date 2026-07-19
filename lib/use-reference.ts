"use client";

import { useEffect, useState } from "react";
import { listReference, type ReferenceKind, type ReferenceRow } from "@/lib/api";

// The fact tables store a specific string per dimension — the option VALUE must
// match it so existing capture/scoring/unique-keys are unaffected:
//   class-levels/qualifications/media-categories → code
//   subjects/lgas                                → name
const VALUE_BY_CODE: Record<string, boolean> = {
  "class-levels": true,
  qualifications: true,
  "media-categories": true,
};

export type RefOption = { value: string; label: string };

// Module-level cache so opening a form repeatedly doesn't refetch.
const cache = new Map<ReferenceKind, RefOption[]>();

function toOptions(kind: ReferenceKind, rows: ReferenceRow[]): RefOption[] {
  const byCode = VALUE_BY_CODE[kind];
  return rows.map((r) => ({
    value: (byCode ? r.code : r.name) ?? r.name,
    label: r.name,
  }));
}

// Fetch a dimension's active rows as {value,label} options for RHFSelect.
export function useReferenceOptions(kind: ReferenceKind) {
  const [options, setOptions] = useState<RefOption[]>(cache.get(kind) ?? []);
  const [loading, setLoading] = useState(!cache.has(kind));

  useEffect(() => {
    if (cache.has(kind)) {
      setOptions(cache.get(kind)!);
      setLoading(false);
      return;
    }
    let active = true;
    listReference(kind)
      .then((rows) => {
        const opts = toOptions(kind, rows);
        cache.set(kind, opts);
        if (active) setOptions(opts);
      })
      .catch(() => {
        // Leave empty; the form still renders (backend re-validates on submit).
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [kind]);

  return { options, loading };
}

// Clear the cache after an admin edits a dimension so forms pick up the change.
export function invalidateReference(kind?: ReferenceKind) {
  if (kind) cache.delete(kind);
  else cache.clear();
}
