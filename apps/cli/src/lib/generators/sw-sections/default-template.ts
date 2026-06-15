/**
 * Default SW template with placeholder markers.
 * Placeholders are replaced during generation with feature-specific code.
 */

export function getDefaultTemplate(): string {
  return `let CACHE_NAME = "";
let ASSETS_TO_CACHE = [];

// [[CACHE_NAME]]
// [[ASSETS_LIST]]
// [[AUTO_SKIP_WAITING]]

const CACHE_NAME_RUNTIME = "swoff-runtime";
const CACHE_NAME_RUNTIME_HTML = "swoff-runtime-html";

// --- Shared IndexedDB Utility ---

function openDB(dbName, version, onUpgrade) {
  return new Promise(function(resolve, reject) {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available (private browsing mode?)"));
      return;
    }
    try {
      var request = indexedDB.open(dbName, version);
      request.onupgradeneeded = function(e) {
        if (onUpgrade) onUpgrade(e.target.result);
      };
      request.onsuccess = function(e) { resolve(e.target.result); };
      request.onerror = function(e) { reject(e.target.error); };
    } catch (e) {
      reject(e);
    }
  });
}

// --- Shared Reactive Intervals ---

var REACTIVE_ENTRIES = null;
var REACTIVE_INTERVALS = null;
var clearAllReactive = null;

// --- Broadcast Helper ---

function broadcastToClients(type, payload) {
  return self.clients.matchAll().then(function(clients) {
    clients.forEach(function(client) {
      client.postMessage(Object.assign({ type: type }, payload || {}));
    });
  });
}

// [[INSTALL_HANDLER]]
// [[ACTIVATE_HANDLER]]
// [[BATCH_REFRESH_QUEUE]]
// [[MESSAGE_HANDLER]]
// [[FETCH_HANDLER]]
// [[TAG_MANAGEMENT]]
// [[PUSH_HANDLERS]]
// [[SERVER_PUSH_HANDLER]]`;
}
