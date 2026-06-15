import type { SwoffConfig } from "../../shared/config-types.js";
import { generateFetchHandler } from "./fetch-handler.js";
import { generateActivateHandler } from "./activate-handler.js";
import { generateInstallHandler } from "./install-handler.js";
import { generateMessageHandler } from "./message-handler.js";
import { generateTagManagement } from "./tag-management.js";
import { generateBatchRefreshQueue } from "./batch-refresh-queue.js";
import { generateSwPushHandlers } from "./sw-push.js";
import { generateServerPushHandler } from "./server-push-handler.js";
import { generateBackgroundSyncHandler } from "./background-sync-handler.js";

const COOKIE_AUTH_TYPES = ["cookie"];

function isCookieAuth(authType: string): boolean {
  return COOKIE_AUTH_TYPES.includes(authType);
}

export function shouldIncludeBackgroundSync(config: SwoffConfig): boolean {
  const { features } = config;
  return !!(
    features.mutationQueue.backgroundSync &&
    features.mutationQueue.enabled &&
    (!features.auth.enabled || isCookieAuth(features.auth.type))
  );
}

export function generateBackgroundSyncCode(config: SwoffConfig): string {
  const { features } = config;
  const authType = features.auth.enabled ? features.auth.type : undefined;
  const mq = features.mutationQueue;
  const maxCacheAge = features.serviceWorker.strategy.maxRuntimeCacheAge;
  return `\n\n${generateBackgroundSyncHandler(authType, mq.batchSize, mq.batchDelayMs, mq.retry, true, maxCacheAge)}`;
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
  const { serviceWorker } = features;
  const { strategy, navigation } = serviceWorker;
  const { refetchQueue } = features;
  const maxCacheAge = strategy.maxRuntimeCacheAge;

  code = code.replace(
    "// [[FETCH_HANDLER]]",
    () => generateFetchHandler({ strategy, navigation, refetchQueue }, true, features.mutationQueue.enabled, features.auth.routePaths, features.realtime.serverPush?.enabled ? features.realtime.serverPush.endpoint : undefined, debug),
  );

  code = code.replace(
    "// [[ACTIVATE_HANDLER]]",
    () => generateActivateHandler(strategy.clearRuntimeOnUpdate, navigation.preload, maxCacheAge),
  );

  code = code.replace("// [[INSTALL_HANDLER]]", () => generateInstallHandler());
  code = code.replace("// [[BATCH_REFRESH_QUEUE]]", () => generateBatchRefreshQueue(
    refetchQueue.retry,
    refetchQueue.batchSize,
    refetchQueue.batchDelayMs,
  ));

  code = code.replace("// [[MESSAGE_HANDLER]]", () => generateMessageHandler(true, features.tagInvalidation.debounceMs ?? 0));
  code = code.replace("// [[TAG_MANAGEMENT]]", () => generateTagManagement(maxCacheAge));

  const endpoint = useApiBasePlaceholder
    ? "SWOFF_API_BASE" + (features.realtime.serverPush?.endpoint ?? "")
    : features.realtime.serverPush?.endpoint ?? "";

  code = features.realtime.pushNotifications
    ? code.replace("// [[PUSH_HANDLERS]]", () => generateSwPushHandlers())
    : code.replace("// [[PUSH_HANDLERS]]", "");

  code = features.realtime.serverPush?.enabled
    ? code.replace(
        "// [[SERVER_PUSH_HANDLER]]",
        () => generateServerPushHandler(
          features.realtime.serverPush.type,
          endpoint,
          features.realtime.serverPush.reconnectDelayMs,
        ),
      )
    : code.replace("// [[SERVER_PUSH_HANDLER]]", "");

  return code;
}
