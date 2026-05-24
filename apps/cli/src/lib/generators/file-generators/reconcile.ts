/**
 * Generates reconcile.js - ID reconciliation after mutation sync.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateReconcile(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const T = (type: string) => (ts ? `: ${type}` : "");
  const R = (type: string) => (ts ? `: ${type} ` : " ");

  const code = `/**
 * Swoff ID Reconciliation
 * Update local records with server data after mutation sync.
 *
 * Usage:
 *   import { reconcileRecord } from './swoff/reconcile.${ext}';
 *
 *   await reconcileRecord('todos', 'temp_abc123', serverData);
 */

import { getRecord, putRecord, deleteRecord } from './store.${ext}';

export async function reconcileRecord(storeName${T("string")}, tempId${T("string")}, serverData${T("Record<string, unknown>")}${R("Promise<void>")}{
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

export async function reconcileReferences(storeName${T("string")}, oldId${T("string")}, newId${T("string | number")}${R("Promise<void>")}{
  // Override this for your app's schema.
}
`;

  writeFile(ctx, `reconcile.${ext}`, code);
}
