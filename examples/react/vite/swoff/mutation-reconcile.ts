/**
 * Swoff Mutation Reconciliation
 * Reconciles local optimistic records with server response after a queued
 * mutation is processed by the service worker.
 *
 * Usage:
 *   import { reconcileRecord } from './swoff/mutation-reconcile.ts';
 *
 *   // Called automatically by mutation-queue after a successful sync
 *   await reconcileRecord('todos', 'temp_abc123', serverData);
 *
 *   // Only override this if your data has foreign key references:
 *   // export async function reconcileReferences(...) { ... }
 */

import { getRecord, putRecord, deleteRecord } from './store.ts';

/** Replace a temporary optimistic ID with the server-assigned ID after mutation sync. Called automatically by mutation-queue. */
export async function reconcileRecord(storeName: string, tempId: string, serverData: Record<string, unknown>): Promise<void> {
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

  await reconcileReferences(storeName, tempId, serverData.id as string | number);
}

/** Update foreign key references in other records that pointed to the old temp ID. Override this for your app's schema relationships. */
export async function reconcileReferences(_storeName: string, _oldId: string, _newId: string | number): Promise<void> {
  // Override this for your app's schema.
}
