/**
 * Swoff ID Reconciliation
 * Update local records with server data after mutation sync.
 *
 * Usage:
 *   import { reconcileRecord } from './swoff/reconcile.ts';
 *
 *   await reconcileRecord('todos', 'temp_abc123', serverData);
 */

import { getRecord, putRecord, deleteRecord } from './store.ts';

export async function reconcileRecord(storeName, tempId, serverData) {
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

  await reconcileReferences(storeName, tempId, serverData.id);
}

export async function reconcileReferences(storeName, oldId, newId) {
  // Override this for your app's schema.
  // Example: update foreign-key references in related stores.
  //
  // const txns = await getAllRecords('transactions');
  // for (const txn of txns) {
  //   if (txn.todoId === oldId) {
  //     txn.todoId = newId;
  //     await putRecord('transactions', txn);
  //   }
  // }
}
