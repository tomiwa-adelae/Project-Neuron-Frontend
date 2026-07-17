// Offline write queue (outbox) for the Security & Vulnerability assessment.
//
// The security endpoints upsert by (school, session), so replaying a queued
// payload is naturally idempotent — no server-side client_id dedupe needed. We
// coalesce per school: the latest draft supersedes an older queued draft, and a
// queued submit supersedes any pending draft for that school (submit carries the
// full form state). Media/other sections are online-only for now.

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  saveSecurityAssessment,
  submitSecurityAssessment,
  ApiError,
  type SecurityAssessmentInput,
} from "@/lib/api";

const DB_NAME = "neuron-outbox";
const DB_VERSION = 1;

export type SecurityJobKind = "security-draft" | "security-submit";

export interface OutboxJob {
  id: string; // dedupe key: `${kind}:${schoolId}`
  kind: SecurityJobKind;
  schoolId: string;
  payload: SecurityAssessmentInput;
  clientId: string; // uuid, for traceability/debugging
  queuedAt: number;
}

interface OutboxDB extends DBSchema {
  jobs: { key: string; value: OutboxJob };
}

let dbPromise: Promise<IDBPDatabase<OutboxDB>> | null = null;

function getDb(): Promise<IDBPDatabase<OutboxDB>> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available."));
  }
  if (!dbPromise) {
    dbPromise = openDB<OutboxDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("jobs")) {
          db.createObjectStore("jobs", { keyPath: "id" });
        }
      },
    });
  }
  return dbPromise;
}

function newClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

// Queue a security draft or submit for later sync.
export async function queueSecurity(
  kind: SecurityJobKind,
  schoolId: string,
  payload: SecurityAssessmentInput,
): Promise<void> {
  const db = await getDb();
  const tx = db.transaction("jobs", "readwrite");
  const store = tx.objectStore("jobs");
  // A submit supersedes any pending draft for the same school.
  if (kind === "security-submit") {
    await store.delete(`security-draft:${schoolId}`);
  }
  await store.put({
    id: `${kind}:${schoolId}`,
    kind,
    schoolId,
    payload,
    clientId: newClientId(),
    queuedAt: Date.now(),
  });
  await tx.done;
}

export async function pendingCount(): Promise<number> {
  try {
    return await (await getDb()).count("jobs");
  } catch {
    return 0;
  }
}

export interface FlushResult {
  synced: number;
  remaining: number;
}

// Replay queued jobs against the API. Drafts flush before submits. A job that
// fails because we're still offline (ApiError status 0) halts the flush and is
// kept for next time. A job the server rejects (e.g. an incomplete submit) is
// not looped forever: its payload is preserved as a draft and the submit job is
// dropped, with `onError` invoked so the UI can tell the user.
export async function flushOutbox(
  onError?: (job: OutboxJob, err: unknown) => void,
): Promise<FlushResult> {
  let db: IDBPDatabase<OutboxDB>;
  try {
    db = await getDb();
  } catch {
    return { synced: 0, remaining: 0 };
  }

  const jobs = await db.getAll("jobs");
  jobs.sort((a, b) =>
    a.kind === b.kind
      ? a.queuedAt - b.queuedAt
      : a.kind === "security-draft"
        ? -1
        : 1,
  );

  let synced = 0;
  for (const job of jobs) {
    try {
      if (job.kind === "security-draft") {
        await saveSecurityAssessment(job.schoolId, job.payload);
      } else {
        await submitSecurityAssessment(job.schoolId, job.payload);
      }
      await db.delete("jobs", job.id);
      synced++;
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        // Still offline — leave this and remaining jobs queued.
        break;
      }
      // Server rejected it. Preserve the data as a draft so nothing is lost,
      // then drop the offending job to avoid a poison-message loop.
      try {
        await saveSecurityAssessment(job.schoolId, job.payload);
      } catch {
        // best-effort
      }
      await db.delete("jobs", job.id);
      onError?.(job, err);
    }
  }

  return { synced, remaining: await db.count("jobs") };
}
