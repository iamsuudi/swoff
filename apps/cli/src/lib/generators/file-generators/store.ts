/**
 * Generates store.js - IndexedDB CRUD operations.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateStore(ctx: GeneratorContext): void {
  const ext = ctx.ext;
  const ts = ext === "ts";
  const T = (type: string) => (ts ? `: ${type}` : "");
  const R = (type: string) => (ts ? `: ${type} ` : " ");
  const PT = (type: string) => (ts ? `<${type}>` : "");
  const AS = (type: string) => (ts ? ` as ${type}` : "");
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

/** Open the app's IndexedDB database. Creates it if it doesn't exist. */
export function openAppDB()${R("Promise<IDBDatabase>")}{
  return new Promise${PT("IDBDatabase")}((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    request.onsuccess = (e) => resolve((e.target${AS("IDBOpenDBRequest")}).result);
    request.onerror = (e) => reject((e.target${AS("IDBRequest")}).error);
  });
}

/** Get a record by ID from an IndexedDB store. Returns undefined if not found. */
export async function getRecord(storeName${T("string")}, id${T("IDBValidKey")})${R("Promise<Record<string, unknown> | undefined>")}{
  const db = await openAppDB();
  return new Promise${PT("Record<string, unknown> | undefined")}((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve((request${AS("IDBRequest<Record<string, unknown> | undefined>")}).result);
    request.onerror = () => reject((request${AS("IDBRequest")}).error);
  });
}

/** Store a record in an IndexedDB store (insert or update). Returns the record's key. */
export async function putRecord(storeName${T("string")}, record${T("Record<string, unknown>")})${R("Promise<IDBValidKey>")}{
  const db = await openAppDB();
  return new Promise${PT("IDBValidKey")}((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.put(record);
    tx.oncomplete = () => resolve((request${AS("IDBRequest<IDBValidKey>")}).result);
    tx.onerror = () => reject((tx${AS("IDBTransaction")}).error);
  });
}

/** Delete a record by ID from an IndexedDB store. */
export async function deleteRecord(storeName${T("string")}, id${T("IDBValidKey")})${R("Promise<void>")}{
  const db = await openAppDB();
  return new Promise${PT("void")}((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject((tx${AS("IDBTransaction")}).error);
  });
}

/** Get all records from an IndexedDB store. */
export async function getAllRecords(storeName${T("string")})${R("Promise<Record<string, unknown>[]>")}{
  const db = await openAppDB();
  return new Promise${PT("Record<string, unknown>[]")}((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve((request${AS("IDBRequest<Record<string, unknown>[]>")}).result);
    request.onerror = () => reject((request${AS("IDBRequest")}).error);
  });
}
`;

  writeFile(ctx, `store.${ext}`, code);
}
