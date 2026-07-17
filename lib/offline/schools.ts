// Offline school-registry cache.
//
// LIEs work in areas with unreliable connectivity, so the school worklist must
// be searchable with no network. We mirror the scoped `/schools` response into
// IndexedDB on every successful online load; when the network is unavailable the
// UI falls back to this cache. Refreshed opportunistically (every online load)
// and considered stale after a week.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { SchoolWorklistItem, AcademicSession } from "@/lib/api";

const DB_NAME = "neuron-offline";
const DB_VERSION = 1;
const STALE_MS = 7 * 24 * 60 * 60 * 1000; // one week

interface RegistryMeta {
  session: AcademicSession | null;
  cachedAt: number;
}

interface NeuronDB extends DBSchema {
  schools: { key: string; value: SchoolWorklistItem };
  meta: { key: string; value: RegistryMeta };
}

let dbPromise: Promise<IDBPDatabase<NeuronDB>> | null = null;

function getDb(): Promise<IDBPDatabase<NeuronDB>> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available."));
  }
  if (!dbPromise) {
    dbPromise = openDB<NeuronDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("schools")) {
          db.createObjectStore("schools");
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta");
        }
      },
    });
  }
  return dbPromise;
}

export interface CachedRegistry {
  session: AcademicSession | null;
  schools: SchoolWorklistItem[];
  cachedAt: number;
  stale: boolean;
}

// Replace the cached worklist with a fresh copy. Best-effort — a caching failure
// must never break the online path, so callers should not await-block on it.
export async function cacheSchools(
  session: AcademicSession | null,
  schools: SchoolWorklistItem[],
): Promise<void> {
  try {
    const db = await getDb();
    const tx = db.transaction(["schools", "meta"], "readwrite");
    const store = tx.objectStore("schools");
    await store.clear();
    await Promise.all(schools.map((s) => store.put(s, s.id)));
    await tx.objectStore("meta").put(
      { session, cachedAt: Date.now() },
      "registry",
    );
    await tx.done;
  } catch {
    // Ignore — offline cache is a convenience, not a source of truth.
  }
}

// Read the cached worklist, or null if nothing has been cached yet.
export async function readCachedSchools(): Promise<CachedRegistry | null> {
  try {
    const db = await getDb();
    const meta = await db.get("meta", "registry");
    if (!meta) return null;
    const schools = await db.getAll("schools");
    return {
      session: meta.session,
      schools,
      cachedAt: meta.cachedAt,
      stale: Date.now() - meta.cachedAt > STALE_MS,
    };
  } catch {
    return null;
  }
}
