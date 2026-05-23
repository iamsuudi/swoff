/**
 * Generates indexeddb.js - DB initialization with schema migrations.
 */

import { GeneratorContext, writeFile } from "./context.js";

export function generateIndexedDB(ctx: GeneratorContext): void {
  const dbName = ctx.config.features.indexeddb?.name || "app-db";
  const stores = ctx.config.features.indexeddb?.stores || [];

  const storesCode =
    stores.length > 0
      ? stores
          .map(
            (store: string, i: number) =>
              `      if (oldVersion < ${i + 1}) {\n        db.createObjectStore("${store}", { keyPath: "id" });\n      }`,
          )
          .join("\n\n")
      : `      // Create your object stores here:
      // if (oldVersion < 1) {
      //   const todos = db.createObjectStore("todos", { keyPath: "id" });
      //   todos.createIndex("by-date", "date");
      // }`;

  const code = `/**
 * Swoff IndexedDB Setup
 * Database initialization with schema migrations.
 *
 * Usage:
 *   import { openDB } from './swoff/indexeddb.js';
 *
 *   const db = await openDB();
 */

const DB_NAME = "${dbName}";
const DB_VERSION = 1;

export function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      const oldVersion = e.oldVersion;

${storesCode}
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

export async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return false;

  const isPersisted = await navigator.storage.persisted();
  if (isPersisted) return true;

  try {
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function monitorStorage() {
  const estimate = await navigator.storage.estimate();
  const ratio = estimate.usage / estimate.quota;

  return {
    usage: estimate.usage,
    quota: estimate.quota,
    ratio,
    status: ratio >= 0.95 ? "critical" : ratio >= 0.8 ? "warning" : "ok",
  };
}
`;

  writeFile(ctx, "indexeddb.js", code);
}
