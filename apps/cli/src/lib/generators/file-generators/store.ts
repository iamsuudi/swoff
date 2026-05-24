/**
 * Generates store.js - IndexedDB CRUD operations.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateStore(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const T = (type: string) => (ts ? `: ${type}` : "");
  const R = (type: string) => (ts ? `: ${type} ` : " ");
  const dbName = "app-db";

  const code = `/**
 * Swoff IndexedDB Store
 * Generic CRUD operations for app's IndexedDB database.
 *
 * Usage:
 *   import { getRecord, putRecord, deleteRecord, openAppDB } from './swoff/store.${ext}';
 *
 *   const record = await getRecord('todos', 'todo-123');
 *   await putRecord('todos', { id: 'todo-123', title: 'New task', $synced: false });
 *   await deleteRecord('todos', 'todo-123');
 */

const DB_NAME = "${dbName}";

export function openAppDB${R("Promise<IDBDatabase>")}{
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function getRecord(storeName${T("string")}, id${T("IDBValidKey")}${R("Promise<Record<string, unknown> | undefined>")}{
  const db = await openAppDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function putRecord(storeName${T("string")}, record${T("Record<string, unknown>")}${R("Promise<IDBValidKey>")}{
  const db = await openAppDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.put(record);
    tx.oncomplete = () => resolve(request.result);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteRecord(storeName${T("string")}, id${T("IDBValidKey")}${R("Promise<void>")}{
  const db = await openAppDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getAllRecords(storeName${T("string")}${R("Promise<Record<string, unknown>[]>")}{
  const db = await openAppDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
`;

  writeFile(ctx, `store.${ext}`, code);
}
