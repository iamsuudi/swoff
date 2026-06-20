import type { RuntimeContext } from "./utils.js";

interface SwoffApiBundleFlags {
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

  const authCode = flags.authEnabled ? generateAuthSection(flags) : "";
  const mutationCode = flags.mutationQueueEnabled ? generateMutationSection(flags) : "";
  const pwaCode = flags.pwaEnabled ? generatePwaSection(flags) : "";
  const gqlCode = flags.gqlEnabled ? generateGqlSection(flags) : "";

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
  function onOnline(callback) {
    if (typeof window === "undefined") return;
    window.addEventListener("online", callback);
  }

  function onOffline(callback) {
    if (typeof window === "undefined") return;
    window.addEventListener("offline", callback);
  }
${authCode}${mutationCode}${pwaCode}${gqlCode}
  // ── Fetch with Cache ──
  var inFlightRequests = new Map();
  var pendingBatches = new Map();

  function fetchWithCache(input, options) {
    options = options || {};
    var method = (options.method || "GET").toUpperCase();
    var isRead = options.type === "read" || (options.type !== "mutation" && (method === "GET" || method === "HEAD" || method === "OPTIONS"));
    var resolvedInput = typeof input === "string" && input.indexOf("://") === -1 && input.indexOf("//") !== 0 ? API_BASE + input : input;
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
    fetchWithCache(input, Object.assign({}, options, { skipFetchCount: true })).catch(function () {});
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

  function getCurrentOnlineStatus() {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
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
    generateTags: generateTags,
    getStorageEstimate: getStorageEstimate,
    formatBytes: formatBytes,
    getCurrentOnlineStatus: getCurrentOnlineStatus,
    onOnline: onOnline,
    onOffline: onOffline,
    resetSwoff: resetSwoff,
    skipWaiting: skipWaiting,
${flags.authEnabled ? "    setAuth: setAuth,\n    getAuth: getAuth,\n    clearAuth: clearAuth,\n    ensureValidAuth: ensureValidAuth," : ""}
${flags.mutationQueueEnabled ? "    queueMutation: queueMutation,\n    flushMutations: flushMutations,\n    getPendingCount: getPendingCount," : ""}
${flags.pwaEnabled ? "    promptInstall: promptInstall,\n    isInstallable: isInstallable," : ""}
${flags.gqlEnabled ? "    fetchWithGql: fetchWithGql,\n    queryGql: queryGql,\n    mutateGql: mutateGql," : ""}
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

function generateAuthSection(flags: SwoffApiBundleFlags): string {
  const isCookie = flags.authType === "cookie";
  return `
  // ── Auth Store ──
  var AUTH_DB_NAME = "swoff-auth";
  var AUTH_STORE_NAME = "auth";
  var memoryAuth = null;
  var _fetchingUser = false;

  var adapter = {
    type: ${JSON.stringify(flags.authType)},
    getHeaders: function (auth) {
      if (!auth || !auth.token) return {};
      return { Authorization: "Bearer " + auth.token };
    },
    getAuth: function () { return Promise.resolve(null); },
    refresh: function () { return Promise.resolve(null); },
    fetchUser: function () { return Promise.resolve(null); },
  };

  function persistUserData(authData) {
    var userData = { user: authData ? authData.user : null, expiresAt: authData ? authData.expiresAt : null };
    return openDB(AUTH_DB_NAME, AUTH_STORE_NAME, "key").then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(AUTH_STORE_NAME, "readwrite");
        var store = tx.objectStore(AUTH_STORE_NAME);
        var request = store.put({ key: "session", value: userData });
        request.onsuccess = function () { resolve(); };
        request.onerror = function () { reject(request.error); };
      }).then(function () { db.close(); });
    });
  }

  function loadUserData() {
    return openDB(AUTH_DB_NAME, AUTH_STORE_NAME, "key").then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(AUTH_STORE_NAME, "readonly");
        var store = tx.objectStore(AUTH_STORE_NAME);
        var request = store.get("session");
        request.onsuccess = function () { resolve(request.result ? request.result.value : null); };
        request.onerror = function () { reject(request.error); };
      }).then(function (result) { db.close(); return result; });
    });
  }

  function clearPersistedData() {
    return openDB(AUTH_DB_NAME, AUTH_STORE_NAME, "key").then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(AUTH_STORE_NAME, "readwrite");
        var store = tx.objectStore(AUTH_STORE_NAME);
        var request = store.delete("session");
        request.onsuccess = function () { resolve(); };
        request.onerror = function () { reject(request.error); };
      }).then(function () { db.close(); });
    });
  }

  function setAuth(authData) {
    memoryAuth = authData;
    return persistUserData(authData);
  }

  function getAuth() {
    if (memoryAuth) return Promise.resolve(memoryAuth);
    return adapter.getAuth().then(function (adapterAuth) {
      if (adapterAuth) {
        memoryAuth = adapterAuth;
        return persistUserData(adapterAuth).then(function () { return memoryAuth; });
      }
      return null;
    }).catch(function () {
      return loadUserData().then(function (userData) {
        if (userData) {
          memoryAuth = userData;
          return memoryAuth;
        }
        if (_fetchingUser) return null;
        _fetchingUser = true;
        return adapter.fetchUser().then(function (fetched) {
          if (fetched) {
            memoryAuth = fetched;
            return persistUserData(fetched).then(function () { return memoryAuth; });
          }
          return null;
        }).catch(function () { return null; }).then(function (result) { _fetchingUser = false; return result; });
      });
    });
  }

  function clearAuth(options) {
    options = options || {};
    if (options.broadcast !== false) {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: "AUTH_CLEARED" });
      }
    }
    memoryAuth = null;
    return clearPersistedData().then(function () {
      try {
        return caches.keys().then(function (keys) {
          return Promise.all(keys.filter(function (name) { return name.indexOf("swoff-runtime") === 0; }).map(function (name) { return caches.delete(name); }));
        });
      } catch (e) { return Promise.resolve(); }
    }).then(function () {
      window.dispatchEvent(new CustomEvent("sw-auth-state-change", { detail: { type: "clear" } }));
    });
  }
${isCookie ? `
  function ensureValidAuth() {
    return getAuth();
  }
` : `
  function tryRestoreSession() {
    return getAuth().then(function (auth) {
      if (!auth) return null;
      return adapter.refresh(auth).then(function (refreshed) {
        if (refreshed) { return setAuth(refreshed).then(function () { return refreshed; }); }
        return null;
      });
    }).catch(function () { return null; });
  }

  var restorePromise = null;
  var refreshPromise = null;

  function ensureValidAuth() {
    return getAuth().then(function (auth) {
      if (!auth) return null;
      if (!auth.token) {
        if (restorePromise) return restorePromise.then(function (r) { restorePromise = null; return r; });
        restorePromise = tryRestoreSession();
        return restorePromise.then(function (r) { restorePromise = null; return r; });
      }
      if (!auth.expiresAt || Date.now() < auth.expiresAt) return auth;
      if (!refreshPromise) {
        refreshPromise = adapter.refresh(auth).then(function (refreshed) {
          if (refreshed) { return setAuth(refreshed).then(function () { return refreshed; }); }
          return clearAuth().then(function () { return null; });
        }).catch(function () {
          return clearAuth().then(function () { return null; });
        });
      }
      return refreshPromise.then(function (r) { refreshPromise = null; return r; });
    });
  }
`}
`;
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

function generateMutationSection(flags: SwoffApiBundleFlags): string {
  return `
  // ── Mutation Queue ──
  var QUEUE_DB_NAME = "swoff-queue";
  var QUEUE_STORE_NAME = "mutations";
  var QUEUE_BATCH_SIZE = ${flags.mutationQueueBatchSize};
  var QUEUE_BATCH_DELAY_MS = ${flags.mutationQueueBatchDelayMs};
  var QUEUE_MAX_RETRIES = ${flags.mutationQueueMaxRetries};
  var QUEUE_RETRY_BACKOFF_MS = ${flags.mutationQueueRetryBackoffMs};
  var QUEUE_RETRY_MAX_BACKOFF_MS = ${flags.mutationQueueRetryMaxBackoffMs};
  var QUEUE_RETRY_JITTER_MS = ${flags.mutationQueueRetryJitterMs};

  function queueBackoffDelay(attempt) {
    var delay = Math.min(QUEUE_RETRY_BACKOFF_MS * Math.pow(2, attempt), QUEUE_RETRY_MAX_BACKOFF_MS);
    return delay + (QUEUE_RETRY_JITTER_MS > 0 ? Math.random() * QUEUE_RETRY_JITTER_MS : 0);
  }

  var isSyncing = false;

  function openQueueDB() {
    return openDB(QUEUE_DB_NAME, QUEUE_STORE_NAME, "id", function (db) {
      if (!db.objectStoreNames.contains(QUEUE_STORE_NAME)) {
        var store = db.createObjectStore(QUEUE_STORE_NAME, { keyPath: "id" });
        store.createIndex("by-timestamp", "timestamp");
      }
    });
  }

  function queueMutation(mutation) {
    return openQueueDB().then(function (db) {
      var tx = db.transaction(QUEUE_STORE_NAME, "readwrite");
      var store = tx.objectStore(QUEUE_STORE_NAME);

      var body = mutation.body;
      var bodyType = "json";
      if (typeof body === "string") {
        bodyType = "text";
      } else if (body instanceof FormData) {
        bodyType = "formdata";
        body = Array.from(body.entries());
      } else if (body instanceof Blob) {
        bodyType = "blob";
      } else if (body instanceof ArrayBuffer || ArrayBuffer.isView(body)) {
        bodyType = "buffer";
      }

      var safeHeaders = Object.assign({}, mutation.headers || {});
      delete safeHeaders["authorization"];
      delete safeHeaders["Authorization"];

      store.add({
        id: crypto.randomUUID(),
        method: mutation.method,
        url: mutation.url,
        body: body,
        bodyType: bodyType,
        headers: safeHeaders,
        timestamp: Date.now(),
        retryCount: 0,
        nextRetryAt: 0,
        tags: mutation.tags || [],
      });

      return new Promise(function (resolve, reject) {
        tx.oncomplete = function () { db.close(); resolve(); };
        tx.onerror = function () { db.close(); reject(tx.error); };
      });
    }).then(function () {
      window.dispatchEvent(new CustomEvent("mutation-queue-changed"));
    });
  }

  function removeFromQueue(id, db) {
    var ownDb = false;
    var p;
    if (!db) {
      p = openQueueDB().then(function (d) { db = d; ownDb = true; return db; });
    } else {
      p = Promise.resolve(db);
    }
    return p.then(function (db) {
      var tx = db.transaction(QUEUE_STORE_NAME, "readwrite");
      tx.objectStore(QUEUE_STORE_NAME).delete(id);
      return new Promise(function (resolve, reject) {
        tx.oncomplete = function () { if (ownDb) db.close(); resolve(); };
        tx.onerror = function () { if (ownDb) db.close(); reject(tx.error); };
      });
    });
  }

  function updateInQueue(item, db) {
    var ownDb = false;
    var p;
    if (!db) {
      p = openQueueDB().then(function (d) { db = d; ownDb = true; return db; });
    } else {
      p = Promise.resolve(db);
    }
    return p.then(function (db) {
      var tx = db.transaction(QUEUE_STORE_NAME, "readwrite");
      tx.objectStore(QUEUE_STORE_NAME).put(item);
      return new Promise(function (resolve, reject) {
        tx.oncomplete = function () { if (ownDb) db.close(); resolve(); };
        tx.onerror = function () { if (ownDb) db.close(); reject(tx.error); };
      });
    });
  }

  function clearQueue() {
    return openQueueDB().then(function (db) {
      var tx = db.transaction(QUEUE_STORE_NAME, "readwrite");
      tx.objectStore(QUEUE_STORE_NAME).clear();
      return new Promise(function (resolve, reject) {
        tx.oncomplete = function () { db.close(); resolve(); };
        tx.onerror = function () { db.close(); reject(tx.error); };
      });
    }).then(function () {
      window.dispatchEvent(new CustomEvent("mutation-queue-changed"));
    });
  }

  function processMutationQueue() {
    if (isSyncing) return Promise.resolve();
    return openQueueDB().then(function (db) {
      isSyncing = true;
      var tx = db.transaction(QUEUE_STORE_NAME, "readonly");
      var store = tx.objectStore(QUEUE_STORE_NAME);
      var index = store.index("by-timestamp");
      return new Promise(function (resolve, reject) {
        var request = index.getAll();
        request.onsuccess = function () { resolve(request.result); };
        request.onerror = function () { reject(request.error); };
      }).then(function (queue) {
        if (queue.length === 0) { isSyncing = false; db.close(); return; }

        var succeeded = 0;
        var failed = 0;
        var total = queue.length;
        var earliestRetry = Infinity;

        function processNext(index) {
          if (index >= queue.length) {
            window.dispatchEvent(new CustomEvent("mutation-sync-complete", { detail: { succeeded: succeeded, failed: failed, total: total } }));
            if (earliestRetry < Infinity && earliestRetry > Date.now()) {
              setTimeout(function () { if (!isSyncing) processMutationQueue(); }, earliestRetry - Date.now());
            }
            isSyncing = false;
            db.close();
            window.dispatchEvent(new CustomEvent("mutation-queue-changed"));
            return;
          }

          var item = queue[index];

          if (item.retryCount >= QUEUE_MAX_RETRIES) {
            removeFromQueue(item.id, db).then(function () {
              failed++; emitProgress(succeeded, failed, total);
              if (QUEUE_BATCH_DELAY_MS > 0 && succeeded + failed < total) {
                setTimeout(function () { processNext(index + 1); }, QUEUE_BATCH_DELAY_MS);
              } else { processNext(index + 1); }
            });
            return;
          }

          if (item.nextRetryAt && Date.now() < item.nextRetryAt) {
            if (item.nextRetryAt < earliestRetry) earliestRetry = item.nextRetryAt;
            processNext(index + 1);
            return;
          }

          replayMutation(item, db).then(function (ok) {
            if (ok) { succeeded++; } else { failed++; }
            emitProgress(succeeded, failed, total);
            if (QUEUE_BATCH_DELAY_MS > 0 && succeeded + failed < total) {
              setTimeout(function () { processNext(index + 1); }, QUEUE_BATCH_DELAY_MS);
            } else { processNext(index + 1); }
          });
        }

        processNext(0);
      });
    });
  }

  function emitProgress(succeeded, failed, total) {
    if ((succeeded + failed) % QUEUE_BATCH_SIZE === 0 || succeeded + failed === total) {
      window.dispatchEvent(new CustomEvent("mutation-sync-progress", { detail: { succeeded: succeeded, failed: failed, total: total } }));
    }
  }

  function replayMutation(item, db) {
    var authPromise = ${flags.authEnabled
      ? "getAuth().then(function (auth) { return auth; })"
      : "Promise.resolve(null)"};
    return authPromise.then(function (auth) {
      var authHeader = {};
      if (auth && auth.token) {
        authHeader = { Authorization: "Bearer " + auth.token };
      }

      var replayBody = null;
      var contentType = undefined;
      var bt = item.bodyType || "json";

      if (bt === "formdata") {
        replayBody = new FormData();
        for (var i = 0; i < (item.body || []).length; i++) {
          replayBody.append(item.body[i][0], item.body[i][1]);
        }
      } else if (bt === "blob" || bt === "buffer") {
        replayBody = item.body;
      } else if (bt === "text") {
        replayBody = item.body;
      } else if (item.body != null) {
        replayBody = JSON.stringify(item.body);
        contentType = "application/json";
      }

      return fetch(item.url, {
        method: item.method,
        headers: Object.assign({}, contentType ? { "Content-Type": contentType } : {}, item.headers, authHeader),
        body: replayBody,
      }).then(function (response) {
        return handleReplayResponse(response, item, db);
      }).catch(function () {
        item.retryCount++;
        item.nextRetryAt = Date.now() + queueBackoffDelay(item.retryCount - 1);
        return updateInQueue(item, db).then(function () { return false; });
      });
    });
  }

  function handleReplayResponse(response, item, db) {
    if (response.ok) {
      if (item.tags && item.tags.length > 0) {
        return invalidateByTags(item.tags).then(function () {
          return removeFromQueue(item.id, db).then(function () { return true; });
        });
      }
      return removeFromQueue(item.id, db).then(function () { return true; });
    }
    if (response.status === 401) {
      return ensureValidAuth().then(function (refreshed) {
        if (refreshed && refreshed.token) {
          var retryHeader = { Authorization: "Bearer " + refreshed.token };
          return fetch(item.url, {
            method: item.method,
            headers: Object.assign({}, item.headers, retryHeader),
            body: item.body ? JSON.stringify(item.body) : null,
          }).then(function (retryResponse) {
            if (retryResponse.ok) {
              if (item.tags && item.tags.length > 0) {
                return invalidateByTags(item.tags);
              }
              return removeFromQueue(item.id, db).then(function () { return true; });
            }
            return removeFromQueue(item.id, db).then(function () { return true; });
          });
        }
        return clearAuth().then(function () { return false; });
      });
    }
    item.retryCount++;
    item.nextRetryAt = Date.now() + queueBackoffDelay(item.retryCount - 1);
    return updateInQueue(item, db).then(function () { return false; });
  }

  function flushMutations() {
    return processMutationQueue();
  }

  function getPendingCount() {
    return openQueueDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(QUEUE_STORE_NAME, "readonly");
        var request = tx.objectStore(QUEUE_STORE_NAME).count();
        request.onsuccess = function () { db.close(); resolve(request.result); };
        request.onerror = function () { db.close(); reject(request.error); };
      });
    });
  }
`;
}

function generatePwaSection(flags: SwoffApiBundleFlags): string {
  const preventLine = flags.pwaPreventDefaultInstall
    ? "      e.preventDefault();\n"
    : "";

  return `
  // ── PWA Install Prompt ──
  function setupPwaInstall() {
    window.addEventListener("beforeinstallprompt", function (e) {
      window.deferredInstallPrompt = e;
      window.pwaInstallable = true;
${preventLine}      window.dispatchEvent(new CustomEvent("pwa-installable", { detail: { isInstallable: true } }));
    });
    window.addEventListener("appinstalled", function () {
      window.deferredInstallPrompt = null;
      window.pwaInstallable = false;
      window.dispatchEvent(new CustomEvent("pwa-installed", { detail: { outcome: "accepted" } }));
    });
  }
  if (typeof window !== "undefined" && typeof document !== "undefined") { setupPwaInstall(); }

  function isInstallable() {
    if (typeof window === "undefined") return false;
    return !!window.deferredInstallPrompt;
  }

  function promptInstall() {
    if (!window.deferredInstallPrompt) {
      return Promise.reject(new Error("Install prompt not available"));
    }
    var promptEvent = window.deferredInstallPrompt;
    return promptEvent.prompt().then(function () {
      return promptEvent.userChoice;
    }).then(function (choice) {
      if (choice.outcome === "accepted") {
        window.dispatchEvent(new CustomEvent("pwa-installed", { detail: { outcome: "accepted" } }));
      } else {
        window.dispatchEvent(new CustomEvent("pwa-dismissed", { detail: { outcome: "dismissed" } }));
      }
      window.deferredInstallPrompt = null;
      return choice;
    });
  }
`;
}

function generateGqlSection(flags: SwoffApiBundleFlags): string {
  const endpointsCode = JSON.stringify(flags.gqlEndpoints);
  return `
  // ── GraphQL Wrapper ──
  var GQL_ENDPOINTS = ${endpointsCode};

  function getOperationName(query) {
    var match = query.match(/(query|mutation|subscription)\\s+(\\w+)/);
    return match ? match[2] : null;
  }

  function isReadOperation(query) {
    var trimmed = query.trim();
    if (trimmed.startsWith("mutation") || trimmed.startsWith("subscription")) return false;
    return true;
  }

  function simpleHash(str) {
    var hash = 0;
    for (var i = 0; i < str.length; i++) {
      var char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).slice(0, 16);
  }

  function bodyHash(obj) {
    var json = JSON.stringify(obj);
    if (typeof crypto !== "undefined" && crypto.subtle && crypto.subtle.digest) {
      try {
        var bytes = new TextEncoder().encode(json);
        return crypto.subtle.digest("SHA-256", bytes).then(function (hash) {
          return Array.from(new Uint8Array(hash)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("").slice(0, 16);
        });
      } catch (e) {}
    }
    return Promise.resolve(simpleHash(json));
  }

  function tagsFromOpName(name) {
    if (!name) return [];
    var stripped = name.replace(/^(get|fetch|list|all|query)/i, "").replace(/^(create|set|add|new|update|delete|remove)/i, "");
    if (!stripped) return [name.toLowerCase()];
    var tag = stripped.toLowerCase();
    var plural = tag.replace(/s$/, "") + "s";
    return [plural, tag];
  }

  function fetchWithGql(query, options, endpointIndex) {
    options = options || {};
    endpointIndex = endpointIndex || 0;
    var isRead = isReadOperation(query);
    var opName = getOperationName(query);
    var variables = options.variables;
    var tags = options.tags || tagsFromOpName(opName);
    var endpoint = GQL_ENDPOINTS[endpointIndex] || GQL_ENDPOINTS[0];

    return bodyHash({ query: query, variables: variables }).then(function (hash) {
      return fetchWithCache(endpoint, {
        method: "POST",
        body: JSON.stringify({ query: query, variables: variables }),
        headers: {
          "Content-Type": "application/json",
          "X-SW-Cache-Key": "gql:" + hash,
        },
        tags: tags,
        type: isRead ? "read" : "mutation",
        auth: options.auth,
        queueOffline: options.queueOffline,
        invalidate: options.invalidate,
      });
    }).then(function (result) {
      var response = result.response;
      if (!response.ok) {
        throw new Error("GraphQL request failed with status " + response.status);
      }
      return response.json().then(function (json) {
        return { data: json.data, fromCache: result.fromCache };
      });
    });
  }

  function queryGql(query, variables, options, endpointIndex) {
    options = options || {};
    options.variables = variables;
    return fetchWithGql(query, options, endpointIndex);
  }

  function mutateGql(mutation, variables, options, endpointIndex) {
    options = options || {};
    options.variables = variables;
    return fetchWithGql(mutation, options, endpointIndex);
  }
`;
}
