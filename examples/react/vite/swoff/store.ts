/**
 * Swoff IndexedDB Store
 * Generic CRUD operations for app's IndexedDB database.
 *
 * Usage:
 *   import { getRecord, putRecord, deleteRecord, openAppDB } from './swoff/store.ts';
 *
 *   const record = await getRecord('todos', 'todo-123');
 *   await putRecord('todos', { id: 'todo-123', title: 'New task', $synced: false });
 *   await deleteRecord('todos', 'todo-123');
 */

const DB_NAME = "app-db";

/** Open the app's IndexedDB database. Creates it if it doesn't exist. */
export function openAppDB(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    request.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    request.onerror = (e) => reject((e.target as IDBRequest).error);
  });
}

/** Get a record by ID from an IndexedDB store. Returns undefined if not found. */
export async function getRecord(storeName: string, id: IDBValidKey): Promise<Record<string, unknown> | undefined> {
  const db = await openAppDB();
  return new Promise<Record<string, unknown> | undefined>((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.get(id);
    request.onsuccess = () => resolve((request as IDBRequest<Record<string, unknown> | undefined>).result);
    request.onerror = () => reject((request as IDBRequest).error);
  });
}

/** Store a record in an IndexedDB store (insert or update). Returns the record's key. */
export async function putRecord(storeName: string, record: Record<string, unknown>): Promise<IDBValidKey> {
  const db = await openAppDB();
  return new Promise<IDBValidKey>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.put(record);
    tx.oncomplete = () => resolve((request as IDBRequest<IDBValidKey>).result);
    tx.onerror = () => reject((tx as IDBTransaction).error);
  });
}

/** Delete a record by ID from an IndexedDB store. */
export async function deleteRecord(storeName: string, id: IDBValidKey): Promise<void> {
  const db = await openAppDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    store.delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject((tx as IDBTransaction).error);
  });
}

/** Get all records from an IndexedDB store. */
export async function getAllRecords(storeName: string): Promise<Record<string, unknown>[]> {
  const db = await openAppDB();
  return new Promise<Record<string, unknown>[]>((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = () => resolve((request as IDBRequest<Record<string, unknown>[]>).result);
    request.onerror = () => reject((request as IDBRequest).error);
  });
}
