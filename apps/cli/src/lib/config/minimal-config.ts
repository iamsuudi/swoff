import type { AuthType } from "../shared/config-types.js";

export interface WizardAnswers {
  framework: string;
  swOutput: string;
  swFilename: string;
  navMode: "spa" | "ssr" | "default";
  fallback: string;
  defaultStrategy: string;
  patterns?: Record<string, string>;
  pwaEnabled: boolean;
  authEnabled: boolean;
  authType?: string;
  mutationEnabled: boolean;
  backgroundSync?: boolean;
  tagInvalidationEnabled: boolean;
  graphqlEnabled: boolean;
  serverPushEnabled: boolean;
  pushNotificationsEnabled: boolean;
  precacheDir?: string;
  precachePrefix?: string;
}

export function buildMinimalConfig(answers: WizardAnswers): Record<string, unknown> {
  const features: Record<string, unknown> = {};

  const sw: Record<string, unknown> = {
    strategy: {
      default: answers.defaultStrategy,
    },
    navigation: {
      mode: answers.navMode,
      fallback: answers.fallback,
    },
  };

  if (answers.patterns && Object.keys(answers.patterns).length > 0) {
    (sw.strategy as Record<string, unknown>).patterns = answers.patterns;
  }

  features.serviceWorker = sw;

  if (answers.pwaEnabled) {
    features.pwa = { enabled: true };
  }

  if (answers.authEnabled) {
    features.auth = {
      enabled: true,
      type: (answers.authType || "cookie") as AuthType,
    };
  }

  if (answers.mutationEnabled) {
    const mq: Record<string, unknown> = { enabled: true };
    if (answers.backgroundSync) {
      mq.backgroundSync = true;
    }
    features.mutationQueue = mq;
  }

  if (answers.tagInvalidationEnabled) {
    features.tagInvalidation = { enabled: true };
  }

  if (answers.graphqlEnabled) {
    features.graphql = { enabled: true };
  }

  if (answers.serverPushEnabled) {
    features.serverPush = {
      enabled: true,
      type: "sse",
      endpoint: "/api/events",
    };
  }

  if (answers.pushNotificationsEnabled) {
    features.pushNotifications = true;
  }

  const build: Record<string, unknown> = {
    swOutput: answers.swOutput,
    swFilename: answers.swFilename,
  };

  if (answers.precacheDir) {
    build.precacheDirs = {
      [answers.precacheDir]: { prefix: answers.precachePrefix || "/" },
    };
  }

  return {
    $schema: "https://swoff.netlify.app/schema/v1.json",
    framework: answers.framework,
    features,
    build,
  };
}
