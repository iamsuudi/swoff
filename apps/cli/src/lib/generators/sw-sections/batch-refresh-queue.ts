export function generateBatchRefreshQueue(
  retryConfig: { maxRetries: number; backoffMs: number; maxBackoffMs: number; jitterMs: number },
  batchSize: number,
  batchDelayMs: number,
): string {
  const retryCode = JSON.stringify(retryConfig);

  return `
// --- Refetch Retry Config ---

const REFETCH_RETRY = ${retryCode};

// --- Shared Backoff & Retry Helpers ---

function backoffDelay(attempt, config) {
  var delay = Math.min(config.backoffMs * Math.pow(2, attempt), config.maxBackoffMs);
  return delay + (config.jitterMs > 0 ? Math.random() * config.jitterMs : 0);
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

async function fetchWithRetry(request, retryConfig) {
  swLog("fetchWithRetry", "ENTER", request.url, 3);
  if (!retryConfig) return fetch(request);
  for (var attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      var controller = new AbortController();
      var id = setTimeout(function() { controller.abort(); }, FETCH_TIMEOUT_MS);
      var response = await fetch(request, { signal: controller.signal });
      clearTimeout(id);
      if (response.ok) {
        swLog("fetchWithRetry", "SUCCESS attempt=" + attempt, request.url, 3);
        return response;
      }
      if (response.status >= 400 && response.status < 500) {
        swLog("fetchWithRetry", "4xx skip retry status=" + response.status, request.url, 3);
        return response;
      }
    } catch {}
    swLog("fetchWithRetry", "RETRY attempt=" + attempt, request.url, 3);
    if (attempt < retryConfig.maxRetries) {
      await sleep(backoffDelay(attempt, retryConfig));
    }
  }
  swLog("fetchWithRetry", "EXHAUSTED", request.url, 3);
  return null;
}

// --- Batch Refresh Queue ---

var REFRESH_QUEUE = new Map();
var REFRESH_TIMER = null;
var REFRESH_RESOLVERS = new Map();

/**
 * Queue a URL for background refresh. Deduplicates by cache key.
 * URLs are processed in batches with rate limiting.
 * Returns a promise that resolves when the URL has been refreshed.
 */
function queueRefresh(url) {
  REFRESH_QUEUE.set(url, true);
  if (!REFRESH_TIMER) {
    REFRESH_TIMER = setTimeout(processRefreshQueue, 50);
  }
  if (!REFRESH_RESOLVERS.has(url)) {
    REFRESH_RESOLVERS.set(url, []);
  }
  var resolvers = REFRESH_RESOLVERS.get(url);
  return new Promise(function(resolve) {
    resolvers.push(resolve);
  });
}

async function processRefreshQueue() {
  if (REFRESH_TIMER) {
    clearTimeout(REFRESH_TIMER);
    REFRESH_TIMER = null;
  }
  if (REFRESH_QUEUE.size === 0) return;
  var urls = [...REFRESH_QUEUE.keys()];
  REFRESH_QUEUE.clear();
  var batch = [];
  for (var i = 0; i < urls.length; i++) {
    batch.push(urls[i]);
    if (batch.length >= ${batchSize} || i === urls.length - 1) {
      await Promise.all(batch.map(async function(url) {
        await refetchEntry(url);
        var resolvers = REFRESH_RESOLVERS.get(url);
        if (resolvers) {
          REFRESH_RESOLVERS.delete(url);
          resolvers.forEach(function(r) { r(); });
        }
      }));
      batch = [];
      if (i < urls.length - 1 && ${batchDelayMs} > 0) {
        await sleep(${batchDelayMs});
      }
    }
  }
}
`;
}
