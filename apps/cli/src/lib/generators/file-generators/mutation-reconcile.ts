/**
 * Generates mutation-reconcile.js - ID reconciliation after mutation sync.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateMutationReconcile(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const T = (type: string) => (ts ? `: ${type}` : "");
  const R = (type: string) => (ts ? `: ${type} ` : " ");
  const AS = (type: string) => (ts ? ` as ${type}` : "");

  const code = `/**
 * Swoff Mutation Reconciliation
 * Reconciles local optimistic records with server response after a queued
 * mutation is processed by the service worker.
 *
 * Usage:
 *   import { reconcileRecord } from './swoff/mutation-reconcile.${ext}';
 *
 *   // Called automatically by mutation-queue after a successful sync
 *   await reconcileRecord('todos', 'temp_abc123', serverData);
 *
 *   // Only override this if your data has foreign key references:
 *   // export async function reconcileReferences(...) { ... }
 */

import { getRecord, putRecord, deleteRecord } from './store.${ext}';

/** Replace a temporary optimistic ID with the server-assigned ID after mutation sync. Called automatically by mutation-queue. */
export async function reconcileRecord(storeName${T("string")}, tempId${T("string")}, serverData${T("Record<string, unknown>")})${R("Promise<void>")}{
  const existing = await getRecord(storeName, tempId);
  if (!existing) return;

  const reconciled = {
    ...existing,
    ...serverData,
    id: serverData.id,
    $synced: true,
    $syncedAt: Date.now(),
  };

  await putRecord(storeName, reconciled);

  if (String(tempId) !== String(serverData.id)) {
    await deleteRecord(storeName, tempId);
  }

  await reconcileReferences(storeName, tempId, serverData.id${AS("string | number")});
}

/** Update foreign key references in other records that pointed to the old temp ID. Override this for your app's schema relationships. */
export async function reconcileReferences(storeName${T("string")}, oldId${T("string")}, newId${T("string | number")})${R("Promise<void>")}{
  // Override this for your app's schema.
}
`;

  writeFile(ctx, `mutation-reconcile.${ext}`, code);
}
