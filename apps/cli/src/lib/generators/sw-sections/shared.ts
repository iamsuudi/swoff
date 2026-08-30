import type { SwoffConfig } from "../../shared/config-types.js";
import { generateFetchHandler } from "./fetch-handler.js";
import { generateActivateHandler } from "./activate-handler.js";
import { generateMessageHandler } from "./message-handler.js";
import { generateTagManagement } from "./tag-management.js";
import { generateBatchRefreshQueue } from "./batch-refresh-queue.js";
import { generateSwPushHandlers } from "./sw-push.js";
import { generateServerPushHandler } from "./server-push-handler.js";
import { generateBackgroundSyncHandler } from "./background-sync-handler.js";
import { generateBackgroundPrecache } from "./background-precache.js";

const COOKIE_AUTH_TYPES = ["cookie"];

function isCookieAuth(authType: string): boolean {
  return COOKIE_AUTH_TYPES.includes(authType);
}

export function shouldIncludeBackgroundSync(config: SwoffConfig): boolean {
  const { features } = config;
  return !!(
    features.caching.mutationQueue.backgroundSync &&
    features.caching.mutationQueue.enabled &&
    features.caching.enabled &&
    (!features.auth.enabled || isCookieAuth(features.auth.type))
  );
}

export function shouldIncludeServerPush(config: SwoffConfig): boolean {
  const { features } = config;
  return !!(
    features.caching.serverPush?.enabled &&
    features.caching.enabled &&
    (!features.auth.enabled || isCookieAuth(features.auth.type))
  );
}

export function generateBackgroundSyncCode(config: SwoffConfig): string {
  const { features } = config;
  const { caching } = features;
  const authType = features.auth.enabled ? features.auth.type : undefined;
  const mq = caching.mutationQueue;
  const maxCacheAge = caching.strategy.maxRuntimeCacheAge;
  return `\n\n${generateBackgroundSyncHandler(authType, mq.batchSize, mq.batchDelayMs, mq.retry, caching.tagInvalidation.enabled, maxCacheAge)}`;
}

/**
 * Applies all SW section generators (fetch, activate, install, message,
 * tag management, push, server push) into the template code.
 *
 * @param code - The template code with placeholder markers
 * @param config - Swoff configuration
 * @param useApiBasePlaceholder - When true, prepend SWOFF_API_BASE to server-push endpoint
 * @returns The code with all sections replaced
 */
export function applySwSections(
  code: string,
  config: SwoffConfig,
  useApiBasePlaceholder: boolean,
  debug?: boolean,
): string {
  const { features } = config;
  const { caching, serviceWorker } = features;
  const { strategy, navigation, refetchQueue } = caching;
  const maxCacheAge = strategy.maxRuntimeCacheAge;
  const spEnabled = shouldIncludeServerPush(config);
  const spEndpoint = caching.serverPush?.endpoint ?? "";

  if (caching.enabled) {
    code = code.replace(
      "// [[FETCH_HANDLER]]",
      () => generateFetchHandler({ strategy, navigation, refetchQueue }, caching.tagInvalidation.enabled, caching.mutationQueue.enabled, features.auth.routePaths, spEnabled ? spEndpoint : undefined, debug),
    );

    code = code.replace(
      "// [[ACTIVATE_HANDLER]]",
      () => generateActivateHandler(navigation.preload, maxCacheAge),
    );
  } else {
    code = code.replace("// [[MESSAGE_HANDLER]]", () => generateMessageHandler(false, 0, false));
    code = code
      .replace("// [[FETCH_HANDLER]]", "")
      .replace("// [[ACTIVATE_HANDLER]]", "")
      .replace("// [[BACKGROUND_PRECACHE]]", "")
      .replace("// [[BATCH_REFRESH_QUEUE]]", "")
      .replace("// [[TAG_MANAGEMENT]]", "")
      .replace("// [[SERVER_PUSH_HANDLER]]", "");

    code = features.pushNotifications
      ? code.replace("// [[PUSH_HANDLERS]]", () => generateSwPushHandlers())
      : code.replace("// [[PUSH_HANDLERS]]", "");

    return code;
  }

  code = code.replace("// [[BACKGROUND_PRECACHE]]", () => generateBackgroundPrecache());
  code = code.replace("// [[BATCH_REFRESH_QUEUE]]", () => generateBatchRefreshQueue(
    refetchQueue.retry,
    refetchQueue.batchSize,
    refetchQueue.batchDelayMs,
  ));

  code = code.replace("// [[MESSAGE_HANDLER]]", () => generateMessageHandler(caching.tagInvalidation.enabled, caching.tagInvalidation.debounceMs ?? 0, true));
  code = caching.tagInvalidation.enabled
    ? code.replace("// [[TAG_MANAGEMENT]]", () => generateTagManagement(maxCacheAge))
    : code.replace("// [[TAG_MANAGEMENT]]", "");

  const endpoint = useApiBasePlaceholder
    ? "SWOFF_API_BASE" + spEndpoint
    : spEndpoint;

  code = features.pushNotifications
    ? code.replace("// [[PUSH_HANDLERS]]", () => generateSwPushHandlers())
    : code.replace("// [[PUSH_HANDLERS]]", "");

  code = spEnabled
    ? code.replace(
        "// [[SERVER_PUSH_HANDLER]]",
        () => generateServerPushHandler(
          caching.serverPush.type,
          endpoint,
          caching.serverPush.reconnectDelayMs,
        ),
      )
    : code.replace("// [[SERVER_PUSH_HANDLER]]", "");

  return code;
}