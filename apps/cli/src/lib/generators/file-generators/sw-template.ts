/**
 * Generates sw-template.js - the SW template with config features baked in.
 * Placeholders are replaced during build by sw-generator.js.
 */

import { GeneratorContext, writeFile } from "./context.js";
import { getDefaultTemplate } from "../sw-sections/default-template.js";
import { generateConfigHeader } from "../sw-sections/config-header.js";
import { generateInstallHandler } from "../sw-sections/install-handler.js";
import { generateActivateHandler } from "../sw-sections/activate-handler.js";
import { generateMessageHandler } from "../sw-sections/message-handler.js";
import { generateFetchHandler } from "../sw-sections/fetch-handler.js";
import { generateTagManagement } from "../sw-sections/tag-management.js";
import { generateSwPushHandlers } from "../sw-sections/sw-push.js";
import { generateServerPushHandler } from "../sw-sections/server-push-handler.js";
import { generateBackgroundSyncHandler } from "../sw-sections/background-sync-handler.js";

export function generateSwTemplate(ctx: GeneratorContext): void {
  const { config } = ctx;
  const { serviceWorker } = config.features;
  const { features } = config;

  let code = getDefaultTemplate();
  code = `// [[HEADER]]\n\n${code}`;

  code = code.replace("// [[CACHE_NAME]]", "// [[CACHE_NAME]]");
  code = code.replace("// [[ASSETS_LIST]]", "// [[ASSETS_LIST]]");
  code = code.replace("// [[AUTO_SKIP_WAITING]]", "// [[AUTO_SKIP_WAITING]]");

  const { strategy, navigation } = serviceWorker;
  const { refetchQueue } = features;
  code = code.replace("// [[FETCH_HANDLER]]", generateFetchHandler({
    strategy,
    navigation,
    refetchQueue,
  }, true, features.mutationQueue.enabled));

  code = code.replace("// [[ACTIVATE_HANDLER]]", generateActivateHandler(strategy.clearRuntimeOnUpdate, navigation.preload, strategy.maxRuntimeCacheAge));
  code = code.replace("// [[INSTALL_HANDLER]]", generateInstallHandler());
  code = code.replace("// [[MESSAGE_HANDLER]]", generateMessageHandler(true, features.tagInvalidation.debounceMs ?? 0));
  code = code.replace("// [[TAG_MANAGEMENT]]", generateTagManagement());

  code = features.pushNotifications?.enabled
    ? code.replace("// [[PUSH_HANDLERS]]", generateSwPushHandlers())
    : code.replace("// [[PUSH_HANDLERS]]", "");

  code = features.serverPush?.enabled
    ? code.replace("// [[SERVER_PUSH_HANDLER]]", generateServerPushHandler(features.serverPush.type, "SWOFF_API_BASE" + features.serverPush.endpoint, features.serverPush.reconnectDelayMs))
    : code.replace("// [[SERVER_PUSH_HANDLER]]", "");

  if (features.mutationQueue.backgroundSync && (!features.auth.enabled || features.auth.type === "cookie")) {
    const authType = features.auth.enabled ? features.auth.type : undefined;
    const mq = features.mutationQueue;
    code += `\n\n${generateBackgroundSyncHandler(authType, mq.batchSize, mq.batchDelayMs, mq.maxRetries, mq.retryBackoffMs, true)}`;
  }

  code += `\n// Dev mode fallback\nif (!CACHE_NAME) CACHE_NAME = "sw-dev-cache";\n`;

  writeFile(ctx, "sw/template.js", code);
}
