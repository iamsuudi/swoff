import type { RuntimeContext } from "./utils.js";
import { generateAuthStoreCode } from "./auth-store.js";
import { generateAuthStateCode } from "./auth-state.js";
import { generateAuthAdapterCode } from "./auth-adapter.js";
import { generateMutationQueueCode } from "./mutation-queue.js";
import { generateMutationStateCode } from "./mutation-state.js";
import { generateBackgroundSyncCode } from "./background-sync.js";
import { generatePushCode } from "./push.js";
import { generatePwaPromptCode } from "./pwa-prompt.js";
import { generateGqlWrapperCode } from "./gql-wrapper.js";
import { generateServerPushCode } from "./server-push.js";

const IIFE_CTX: RuntimeContext = { ts: false, ext: "js" };

function stripModuleWrappers(code: string, renames?: Record<string, string>): string {
  code = code.replace(/^import\s+.*$/gm, "");
  code = code.replace(/^import\s+type\s+.*$/gm, "");
  code = code.replace(/^export\s+default\s+/gm, "");
  code = code.replace(/^export\s+(async\s+)?function\s+(\w+)\s*\(/gm, (_, asyncKw, name) => {
    const renamed = renames?.[name] ?? name;
    return `var ${renamed} = ${asyncKw || ""}function(`;
  });
  code = code.replace(/^export\s+(const|let|var)\s+(\w+)/gm, (_, _kw, name) => {
    const renamed = renames?.[name] ?? name;
    return `var ${renamed}`;
  });
  code = code.replace(/^export\s+(interface|type)\s+\w+/gm, "");
  code = code.replace(/^export\s+\{\s*[\s\S]*?\s*\};\s*$/gm, "");
  code = code.replace(/^const\s+/gm, "var ");
  code = code.replace(/^let\s+/gm, "var ");
  if (renames) {
    for (const [from, to] of Object.entries(renames)) {
      code = code.replace(new RegExp(`\\b${from}\\b`, "g"), to);
    }
  }
  code = code.replace(/\n{3,}/g, "\n\n");
  return code.trim();
}

interface SwoffApiBundleFlags {
  cachingEnabled: boolean;
  tagInvalidationEnabled: boolean;
  authEnabled: boolean;
  authType: string;
  authRoutePaths: string[];
  mutationQueueEnabled: boolean;
  mutationQueueBatchSize: number;
  mutationQueueBatchDelayMs: number;
  mutationQueueMaxRetries: number;
  mutationQueueRetryBackoffMs: number;
  mutationQueueRetryMaxBackoffMs: number;
  mutationQueueRetryJitterMs: number;
  pwaEnabled: boolean;
  pwaPreventDefaultInstall: boolean;
  requestBatchWindowMs: number;
  tagInvalidationSkipPrefixes: string[];
  tagInvalidationPatterns: Record<string, string[]>;
  tagInvalidationSingularization: Record<string, string>;
  tagInvalidationCascading: Record<string, string[]>;
  gqlEnabled: boolean;
  gqlEndpoints: string[];
  pushNotificationsEnabled: boolean;
  serverPushEnabled: boolean;
  serverPushType: string;
  serverPushEndpoint: string;
  serverPushReconnectDelayMs: number;
}

export function generateSwoffApiBundleCode(
  ctx: RuntimeContext,
  flags: SwoffApiBundleFlags,
): string {
  const cascadingCode = flags.tagInvalidationCascading && Object.keys(flags.tagInvalidationCascading).length > 0
    ? JSON.stringify(flags.tagInvalidationCascading)
    : "null";

  const prefixesCode = JSON.stringify(flags.tagInvalidationSkipPrefixes);
  const singularizationCode = flags.tagInvalidationSingularization && Object.keys(flags.tagInvalidationSingularization).length > 0
    ? JSON.stringify(flags.tagInvalidationSingularization)
    : "null";

  const AUTH_RENAMES: Record<string, string> = { DB_NAME: "AUTH_DB_NAME", STORE_NAME: "AUTH_STORE_NAME" };
  const authAdapterCode = stripModuleWrappers(generateAuthAdapterCode(IIFE_CTX, flags.authType), AUTH_RENAMES);
  const authStoreCode = stripModuleWrappers(generateAuthStoreCode(IIFE_CTX, flags.authType, flags.authRoutePaths, flags.mutationQueueEnabled, flags.cachingEnabled), AUTH_RENAMES);
  const authStateCode = stripModuleWrappers(generateAuthStateCode(IIFE_CTX), AUTH_RENAMES);
  const authCode = flags.authEnabled
    ? authAdapterCode + "\n" + authStoreCode + "\n" + authStateCode
    : "";

  const MUTATION_RENAMES: Record<string, string> = { DB_NAME: "QUEUE_DB_NAME", STORE_NAME: "QUEUE_STORE_NAME" };
  const mutationCode = flags.mutationQueueEnabled
    ? stripModuleWrappers(generateMutationQueueCode(IIFE_CTX, flags.authEnabled, flags.tagInvalidationEnabled, flags.mutationQueueBatchSize, flags.mutationQueueBatchDelayMs, flags.mutationQueueMaxRetries, flags.mutationQueueRetryBackoffMs, flags.mutationQueueRetryMaxBackoffMs, flags.mutationQueueRetryJitterMs), MUTATION_RENAMES)
      + "\n" + stripModuleWrappers(generateMutationStateCode(IIFE_CTX), MUTATION_RENAMES)
      + "\n" + stripModuleWrappers(generateBackgroundSyncCode(IIFE_CTX), MUTATION_RENAMES)
    : "";

  const pwaCode = flags.pwaEnabled
    ? stripModuleWrappers(generatePwaPromptCode({ ...IIFE_CTX, preventDefaultInstall: flags.pwaPreventDefaultInstall }))
      + "\nif (typeof window !== \"undefined\" && typeof document !== \"undefined\") { setupPwaInstall(); }"
    : "";
  const gqlCode = flags.gqlEnabled
    ? stripModuleWrappers(generateGqlWrapperCode(IIFE_CTX, flags.gqlEndpoints))
    : "";
  const pushCode = flags.pushNotificationsEnabled
    ? stripModuleWrappers(generatePushCode(IIFE_CTX))
    : "";
  const serverPushCode = flags.serverPushEnabled
    ? stripModuleWrappers(generateServerPushCode(IIFE_CTX, flags.serverPushType, flags.serverPushEndpoint, flags.serverPushReconnectDelayMs))
    : "";

  return `(function () {
  "use strict";

  // ── Constants ──
  var API_BASE = "";
  var CASCADING = ${cascadingCode};
  var SKIP_PREFIXES = ${prefixesCode};
  var SINGULARIZATION = ${singularizationCode};
  var BATCH_WINDOW_MS = ${flags.requestBatchWindowMs};

  // ── IndexedDB Helper ──
  function openDB(name, storeName, keyPath, upgradeCallback, version) {
    return new Promise(function (resolve, reject) {
      var request = indexedDB.open(name, version || 1);
      request.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (upgradeCallback) {
          upgradeCallback(db);
        } else if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: keyPath });
        }
      };
      request.onsuccess = function (e) { resolve(e.target.result); };
      request.onerror = function (e) { reject(e.target.error); };
    });
  }

  // ── Auth Failure Check ──
  async function isAuthFailureResponse(response) {
    return response.status === 401;
  }

  // ── Cache Tags ──
  var TAG_PATTERNS = ${compilePatterns(flags.tagInvalidationPatterns)};

  function generateTags(url) {
    var base = typeof window !== "undefined" ? window.location.origin : "";
    var parsed;
    try {
      parsed = typeof url === "string" ? new URL(url, base) : url;
    } catch (e) {
      return [];
    }
    var path = parsed.pathname;

    for (var i = 0; i < TAG_PATTERNS.length; i++) {
      var entry = TAG_PATTERNS[i];
      var match = path.match(entry.re);
      if (match) {
        var params = {};
        for (var j = 0; j < entry.params.length; j++) {
          params[entry.params[j]] = match[j + 1];
        }
        return entry.templates.map(function (tmpl) {
          return tmpl.replace(/\\{(\\w+)\\}/g, function (_, key) { return params[key] || ""; });
        });
      }
    }

    var segments = path.split("/").filter(Boolean);
    if (segments.length === 0) return ["root"];

    var startIdx = 0;
    while (startIdx < segments.length && SKIP_PREFIXES.indexOf(segments[startIdx]) !== -1) {
      startIdx++;
    }

    var resourceSegments = segments.slice(startIdx);
    if (resourceSegments.length === 0) return ["root"];

    var tags = [];
    tags.push(resourceSegments[0]);

    if (resourceSegments.length >= 2 && !isNaN(Number(resourceSegments[1]))) {
      var collection = resourceSegments[0];
      var id = resourceSegments[1];
      var singular = SINGULARIZATION && SINGULARIZATION[collection] !== undefined
        ? SINGULARIZATION[collection]
        : collection.replace(/s$/, "");
      tags.push(singular + ":" + id);
    }

    for (var k = 2; k < resourceSegments.length; k++) {
      if (isNaN(Number(resourceSegments[k]))) {
        tags.push(resourceSegments[k]);
      }
    }

    return tags;
  }

  function generateTagsFromMethod(method, url) {
    var tags = generateTags(url);
    if (method === "GET" || method === "HEAD") return tags;
    return tags.map(function (tag) { return method.toLowerCase() + "-" + tag; });
  }

  function expandCascading(tags) {
    if (!CASCADING) return tags.slice();
    var result = new Set(tags);
    for (var i = 0; i < tags.length; i++) {
      var deps = CASCADING[tags[i]];
      if (deps) {
        for (var j = 0; j < deps.length; j++) {
          result.add(deps[j]);
        }
      }
    }
    return Array.from(result);
  }

  // ── Cache Invalidation ──
  function invalidateByTag(tag) {
    if (!navigator.serviceWorker || !navigator.serviceWorker.controller) return Promise.resolve();
    navigator.serviceWorker.controller.postMessage({ type: "INVALIDATE_TAG", tag: tag });
    return Promise.resolve();
  }

  function invalidateByTags(tags) {
    return Promise.all(tags.map(function (tag) { return invalidateByTag(tag); }));
  }

  function invalidateUrl(url) {
    var tags = generateTags(url);
    var allTags = CASCADING ? expandCascading(tags) : tags;
    return invalidateByTags(allTags);
  }

  function invalidateByMethod(method, url) {
    var tags = generateTagsFromMethod(method, url);
    var allTags = CASCADING ? expandCascading(tags) : tags;
    return invalidateByTags(allTags);
  }

  function invalidateMatching(glob) {
    var controller = navigator.serviceWorker && navigator.serviceWorker.controller;
    if (!controller) return Promise.resolve();
    controller.postMessage({ type: "INVALIDATE_MATCHING", glob: glob });
    return Promise.resolve();
  }

  function getUrlsForTag(tag) {
    var controller = navigator.serviceWorker && navigator.serviceWorker.controller;
    if (!controller) return Promise.resolve([]);
    return new Promise(function (resolve) {
      var channel = new MessageChannel();
      var timer = setTimeout(function () { channel.port1.close(); resolve([]); }, 5000);
      channel.port1.onmessage = function (event) {
        clearTimeout(timer);
        resolve(event.data.urls || []);
      };
      controller.postMessage({ type: "GET_URLS_FOR_TAG", tag: tag }, [channel.port2]);
    });
  }

  function getTagsForUrl(url) {
    var controller = navigator.serviceWorker && navigator.serviceWorker.controller;
    if (!controller) return Promise.resolve([]);
    return new Promise(function (resolve) {
      var channel = new MessageChannel();
      var timer = setTimeout(function () { channel.port1.close(); resolve([]); }, 5000);
      channel.port1.onmessage = function (event) {
        clearTimeout(timer);
        resolve(event.data.tags || []);
      };
      controller.postMessage({ type: "GET_TAGS_FOR_URL", url: url }, [channel.port2]);
    });
  }

  // ── Storage ──
  function getStorageEstimate() {
    if (!navigator.storage || !navigator.storage.estimate) {
      return Promise.resolve({ usage: 0, quota: 0, percentUsed: 0 });
    }
    return navigator.storage.estimate().then(function (est) {
      var usage = est.usage || 0;
      var quota = est.quota || 0;
      var percentUsed = quota > 0 ? Math.round((usage / quota) * 100) : 0;
      return { usage: usage, quota: quota, percentUsed: percentUsed };
    });
  }

  function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    var units = ["B", "KB", "MB", "GB"];
    var i = Math.floor(Math.log(bytes) / Math.log(1024));
    return (bytes / Math.pow(1024, i)).toFixed(1) + " " + units[i];
  }

  // ── Connectivity ──
  // onOnline/onOffline listen to the shared, verified status change event
  // (CONNECTIVITY_EVENT), so callbacks fire only after real HEAD-verified
  // transitions — not raw navigator.onLine flips.
  function onOnline(callback) {
    if (typeof window === "undefined") return;
    window.addEventListener(CONNECTIVITY_EVENT, function (event) {
      if (event.detail && event.detail.online) callback();
    });
  }

  function onOffline(callback) {
    if (typeof window === "undefined") return;
    window.addEventListener(CONNECTIVITY_EVENT, function (event) {
      if (event.detail && !event.detail.online) callback();
    });
  }
${authCode}${mutationCode}${pwaCode}${gqlCode}${pushCode}${serverPushCode}
  // ── Fetch with Cache ──
  var inFlightRequests = new Map();
  var pendingBatches = new Map();

  function fetchWithCache(input, options) {
    options = options || {};
    var method = (options.method || "GET").toUpperCase();
    var isRead = options.type === "read" || (options.type !== "mutation" && (method === "GET" || method === "HEAD" || method === "OPTIONS"));
    var resolvedInput = input;
    var url = typeof resolvedInput === "string" ? resolvedInput : resolvedInput.url;

    var headers = new Headers(options.headers);

    if (!headers.has("X-SW-Type")) {
      headers.set("X-SW-Type", isRead ? "read" : "mutation");
    }

    if (!options.tags && isRead) {
      var urlTags = generateTags(url);
      if (urlTags.length > 0) {
        headers.set("X-SW-Cache-Tags", urlTags.join(","));
      }
    }

    if (options.tags && options.tags.length > 0) {
      headers.set("X-SW-Cache-Tags", options.tags.join(","));
    }

    if (options.strategy) {
      headers.set("X-SW-Strategy", options.strategy);
    }
    if (options.staleTime !== undefined) {
      headers.set("X-SW-Stale-Time", String(options.staleTime));
    }
    if (options.refetchInterval !== undefined) {
      headers.set("X-SW-Refetch-Interval", String(options.refetchInterval));
    }
    if (options.refetchOnFocus !== undefined) {
      headers.set("X-SW-Refetch-On-Focus", String(options.refetchOnFocus));
    }
    if (options.refetchOnReconnect !== undefined) {
      headers.set("X-SW-Refetch-On-Reconnect", String(options.refetchOnReconnect));
    }
    if (options.queueOffline === false) {
      headers.set("X-SW-No-Queue", "true");
    }
${flags.authEnabled ? generateAuthFetchBlock(flags) : ""}
    var fetchOptions = Object.assign({}, options, { headers: headers });
${flags.authEnabled && flags.authType === "cookie" ? "    fetchOptions.credentials = \"include\";\n" : ""}
    if (options.signal && options.signal.aborted) {
      return Promise.reject(new DOMException("The operation was aborted", "AbortError"));
    }

    var mutationTags = [];
    if (!isRead) {
      var invalidateSetting = options.invalidate !== false ? (options.invalidate || "auto") : false;
      if (invalidateSetting !== false) {
        if (Array.isArray(invalidateSetting)) {
          mutationTags = invalidateSetting;
        } else {
          mutationTags = generateTags(url);
          mutationTags = expandCascading(mutationTags);
        }
        headers.set("X-SW-Invalidate-Tags", mutationTags.join(","));
      }
    }

    var responsePromise;
    if (isRead && inFlightRequests.has(url)) {
      responsePromise = inFlightRequests.get(url).then(function (r) { return r.clone(); });
    } else if (isRead && pendingBatches.has(url)) {
      responsePromise = new Promise(function (resolve, reject) {
        pendingBatches.get(url).resolvers.push(resolve);
        pendingBatches.get(url).rejectors.push(reject);
      });
    } else {
      var abortHandler = function () {
        inFlightRequests.delete(url);
        if (pendingBatches.has(url)) {
          var batch = pendingBatches.get(url);
          clearTimeout(batch.timer);
          pendingBatches.delete(url);
          batch.rejectors.forEach(function (rej) { rej(new DOMException("The operation was aborted", "AbortError")); });
        }
      };
      if (options.signal) {
        options.signal.addEventListener("abort", abortHandler, { once: true });
      }
      if (isRead && BATCH_WINDOW_MS > 0) {
        var batch = { resolvers: [], rejectors: [], timer: 0 };
        pendingBatches.set(url, batch);
        batch.timer = setTimeout(function () {
          pendingBatches.delete(url);
          var promise = fetch(resolvedInput, fetchOptions);
          var cleanup = function () {
            inFlightRequests.delete(url);
            if (options.signal) {
              options.signal.removeEventListener("abort", abortHandler);
            }
          };
          inFlightRequests.set(url, promise.then(function (r) { cleanup(); return r; }, function (e) { cleanup(); throw e; }));
          promise.then(function (r) {
            batch.resolvers.forEach(function (res) { res(r.clone()); });
          }).catch(function (err) {
            batch.rejectors.forEach(function (rej) { rej(err); });
          });
        }, BATCH_WINDOW_MS);
        responsePromise = new Promise(function (resolve, reject) {
          batch.resolvers.push(resolve);
          batch.rejectors.push(reject);
        });
      } else {
        responsePromise = fetch(resolvedInput, fetchOptions).then(function (r) {
          inFlightRequests.delete(url);
          if (options.signal) {
            options.signal.removeEventListener("abort", abortHandler);
          }
          return r;
        }, function (e) {
          inFlightRequests.delete(url);
          if (options.signal) {
            options.signal.removeEventListener("abort", abortHandler);
          }
          throw e;
        });
      }
    }

    return responsePromise.then(function (response) {
      if (!isRead) {
        var mutationSuccess = options.validateSuccess ? options.validateSuccess(response) : response.ok;
        var mutationQueued = response.headers.get("X-SW-Mutation-Queued") === "true";
        if (mutationSuccess && !mutationQueued) {
          var invalidateSetting = options.invalidate !== false ? (options.invalidate || "auto") : false;
          if (invalidateSetting !== false) {
            var invalidateTarget = options.invalidateUrl || url;
            if (Array.isArray(invalidateSetting)) {
              invalidateByTags(invalidateSetting);
            } else {
              invalidateUrl(invalidateTarget);
            }
          }
        }
      }
      var fromCache = response.headers.get("X-SW-From-Cache") === "true";
      var queued = response.headers.get("X-SW-Mutation-Queued") === "true";
      return { response: response, fromCache: fromCache, queued: queued };
    }).catch(function (err) {
      if (err instanceof TypeError) {
        if (isRead) {
          if (options.signal && options.signal.aborted) throw new DOMException("The operation was aborted", "AbortError");
          return caches.match(resolvedInput).then(function (cached) {
            if (cached) return { response: cached, fromCache: true, queued: false };
            throw new Error("Offline: no cached data available");
          });
        }
      }
      throw err;
    });
  }

  function prefetchCache(input, options) {
    fetchWithCache(input, options).catch(function () {});
  }

  // ── Reset ──
  var KNOWN_DB_NAMES = ["swoff-auth", "swoff-queue", "swoff-cache-tags", "swoff-push"];

  function deleteSwoffDatabases(warnings) {
    var dbNames = KNOWN_DB_NAMES.slice();
    try {
      if (indexedDB.databases) {
        return indexedDB.databases().then(function (allDbs) {
          for (var i = 0; i < allDbs.length; i++) {
            if (allDbs[i].name && allDbs[i].name.indexOf("swoff-") === 0 && dbNames.indexOf(allDbs[i].name) === -1) {
              dbNames.push(allDbs[i].name);
            }
          }
          return deleteAll(dbNames, warnings);
        });
      }
    } catch (e) {}
    return deleteAll(dbNames, warnings);
  }

  function deleteAll(dbNames, warnings) {
    for (var i = 0; i < dbNames.length; i++) {
      try {
        indexedDB.deleteDatabase(dbNames[i]);
      } catch (e) {
        warnings.push("Failed to delete database \\"" + dbNames[i] + "\\": " + e);
      }
    }
    return Promise.resolve();
  }

  function resetSwoff(opts) {
    opts = opts || {};
    var options = {
      clearCache: opts.clearCache !== false,
      clearIdb: opts.clearIdb !== false,
      clearStorage: opts.clearStorage !== false,
      resetSwCache: opts.resetSwCache !== false,
    };
    var warnings = [];
    window.dispatchEvent(new CustomEvent("swoff:reset-start"));

    var promises = [];

    if (options.clearCache) {
      try {
        if (typeof caches !== "undefined") {
          promises.push(caches.keys().then(function (keys) {
            return Promise.all(keys.map(function (k) { return caches.delete(k); }));
          }).catch(function (e) {
            warnings.push("Failed to clear caches: " + e);
          }));
        }
      } catch (e) {
        warnings.push("Failed to clear caches: " + e);
      }
    }

    if (options.clearIdb) {
      promises.push(deleteSwoffDatabases(warnings));
    }

    if (options.clearStorage) {
      try {
        localStorage.removeItem("swRegisteredVersion");
      } catch (e) {
        warnings.push("Failed to clear localStorage: " + e);
      }
    }

    if (options.resetSwCache) {
      try {
        if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
          promises.push(navigator.serviceWorker.ready.then(function (registration) {
            if (registration.active) {
              return new Promise(function (resolve) {
                var channel = new MessageChannel();
                var timer = setTimeout(function () { channel.port1.close(); resolve(); }, 10000);
                channel.port1.onmessage = function (event) {
                  if (event.data.type === "RESET_CACHE_COMPLETE") {
                    clearTimeout(timer);
                    resolve();
                  }
                };
                registration.active.postMessage({ type: "RESET_CACHE" }, [channel.port2]);
              });
            }
          }).catch(function (e) {
            warnings.push("Failed to reset SW cache: " + e);
          }));
        }
      } catch (e) {
        warnings.push("Failed to reset SW cache: " + e);
      }
    }

    return Promise.all(promises).then(function () {
      var result = { warnings: warnings };
      window.dispatchEvent(new CustomEvent("swoff:reset-complete", { detail: result }));
      return result;
    });
  }

  // ── Utilities ──
  function skipWaiting() {
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: "SKIP_WAITING" });
    }
  }

  // ── Shared Online Status Primitive ──
  // Single source of truth for online state, also embedded in
  // client-injector.bundle.js. Both connectivity and auth rely on it.
  var CONNECTIVITY_EVENT = "app-connectivity-change";
  var _currentOnlineStatus = typeof navigator !== "undefined" ? navigator.onLine : true;

  function getCurrentOnlineStatus() {
    return _currentOnlineStatus;
  }

  function dispatchState(isTrulyOnline) {
    _currentOnlineStatus = isTrulyOnline;
    window.dispatchEvent(new CustomEvent(CONNECTIVITY_EVENT, { detail: { online: isTrulyOnline } }));
  }

  // ── Configuration ──
  function configure(opts) {
    if (!opts) return;
    if (opts.apiBase !== undefined) API_BASE = opts.apiBase;
    if (opts.auth) {
      if (opts.auth.type !== undefined) adapter.type = opts.auth.type;
      if (opts.auth.getHeaders) adapter.getHeaders = opts.auth.getHeaders;
      if (opts.auth.refresh) adapter.refresh = opts.auth.refresh;
      if (opts.auth.fetchUser) adapter.fetchUser = opts.auth.fetchUser;
    }
    if (opts.push) {
      if (opts.push.vapidPublicKey !== undefined) VAPID_PUBLIC_KEY = opts.push.vapidPublicKey;
    }
  }

  // ── Assembly ──
  var api = {
    configure: configure,
    fetchWithCache: fetchWithCache,
    prefetchCache: prefetchCache,
    invalidateByTag: invalidateByTag,
    invalidateByTags: invalidateByTags,
    invalidateUrl: invalidateUrl,
    invalidateByMethod: invalidateByMethod,
    invalidateMatching: invalidateMatching,
    getUrlsForTag: getUrlsForTag,
    getTagsForUrl: getTagsForUrl,
    generateTags: generateTags,
    getStorageEstimate: getStorageEstimate,
    formatBytes: formatBytes,
    getCurrentOnlineStatus: getCurrentOnlineStatus,
    onOnline: onOnline,
    onOffline: onOffline,
    resetSwoff: resetSwoff,
    skipWaiting: skipWaiting,
    forceRetry: typeof window !== "undefined" && typeof window.__SWOFF_FORCE_RETRY === "function" ? window.__SWOFF_FORCE_RETRY : function () { return Promise.resolve(); },
${flags.authEnabled ? "    setAuth: setAuth,\n    getAuth: getAuth,\n    clearAuth: clearAuth,\n    ensureValidAuth: ensureValidAuth,\n    clearMemoryAuth: clearMemoryAuth,\n    getAuthState: getAuthState," : ""}
${flags.mutationQueueEnabled ? "    queueMutation: queueMutation,\n    flushMutations: flushMutations,\n    clearQueue: clearQueue,\n    getPendingCount: getPendingCount,\n    getQueueItems: getQueueItems,\n    getQueuePosition: getQueuePosition,\n    syncWhenPossible: syncWhenPossible,\n    retrySync: retrySync," : ""}
${flags.pwaEnabled ? "    promptInstall: promptInstall,\n    isInstallable: isInstallable," : ""}
${flags.gqlEnabled ? "    fetchWithGql: fetchWithGql,\n    queryGql: queryGql,\n    mutateGql: mutateGql," : ""}
${flags.pushNotificationsEnabled ? "    requestNotificationPermission: requestNotificationPermission,\n    getPushSubscription: getPushSubscription,\n    subscribeToPush: subscribeToPush,\n    unsubscribeFromPush: unsubscribeFromPush,\n    isSubscribed: isSubscribed," : ""}
${flags.serverPushEnabled ? "    startPushEvents: startPushEvents,\n    stopPushEvents: stopPushEvents,\n    isPushConnected: isPushConnected," : ""}
  };

  if (typeof window !== "undefined") {
    window.swoff = api;
  }
})();
`;
}


function compilePatterns(patterns: Record<string, string[]>): string {
  const entries: string[] = [];
  for (const [pattern, templates] of Object.entries(patterns)) {
    const compiled = compilePatternEntry(pattern, templates);
    if (compiled) {
      entries.push(
        `  { re: new RegExp("${compiled.regex.replace(/\\/g, "\\\\")}"), params: ${JSON.stringify(compiled.params)}, templates: ${JSON.stringify(compiled.templates)} }`,
      );
    }
  }
  return "[\n" + entries.join(",\n") + "\n]";
}

interface PatternEntry {
  regex: string;
  params: string[];
  templates: string[];
}

function compilePatternEntry(rawPattern: string, tagTemplates: string[]): PatternEntry | null {
  const rawParts = rawPattern.split("/");
  const parts = rawParts.filter((p) => p !== "");
  const paramNames: string[] = [];
  const regexParts: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (part === "**") {
      regexParts.push("(?:\\/[^/]+)*");
      continue;
    }

    if (regexParts.length > 0) {
      regexParts.push("\\/");
    }

    if (part === "*") {
      regexParts.push("[^/]+");
    } else if (part.startsWith(":")) {
      paramNames.push(part.slice(1));
      regexParts.push("([^/]+)");
    } else if (part.includes("{")) {
      const close = part.indexOf("}");
      if (close !== -1) {
        const inner = part.slice(part.indexOf("{") + 1, close);
        const alternatives = inner.split(",").map((s) => s.trim().replace(/[.+^${}()|[\]\\]/g, "\\$&"));
        regexParts.push("(?:" + alternatives.join("|") + ")");
      } else {
        regexParts.push(part.replace(/[.+^${}()|[\]\\]/g, "\\$&"));
      }
    } else {
      regexParts.push(part.replace(/[.+^${}()|[\]\\]/g, "\\$&"));
    }
  }

  if (regexParts.length === 0) return null;

  const hasLeadingSlash = rawPattern.startsWith("/");
  const regex = (hasLeadingSlash ? "^\\/" : "^") + regexParts.join("") + "$";

  const templatePlaceholders = new Set<string>();
  for (const tmpl of tagTemplates) {
    const matches = tmpl.match(/\{(\w+)\}/g);
    if (matches) {
      for (const m of matches) {
        templatePlaceholders.add(m.slice(1, -1));
      }
    }
  }
  for (const ph of templatePlaceholders) {
    if (!paramNames.includes(ph)) {
      return null;
    }
  }

  return { regex, params: paramNames, templates: tagTemplates };
}


function generateAuthFetchBlock(flags: SwoffApiBundleFlags): string {
  return `
    if (options.auth) {
      return getAuth().then(function (auth) {
        if (auth && auth.token) {
          headers.set("Authorization", "Bearer " + auth.token);
        }
      }).then(function () {});
    }
`;
}


