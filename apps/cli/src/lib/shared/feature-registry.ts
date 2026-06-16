import type { AuthType, SwoffConfig } from "./config-types.js";

export interface FeatureDef {
  id: string;
  label: string;
  description: string;
  /** Other features that must also be enabled */
  requires: string[];
  /** Auth types that are incompatible (feature cannot function with these) */
  incompatibleAuthTypes: AuthType[];
  /** Returns true if this feature is effectively enabled in the given config */
  checkEnabled: (config: SwoffConfig) => boolean;
  /** Config update to apply when adding this feature via `swoff add` */
  configUpdate: Record<string, unknown>;
  /** Whether the feature is a "core" always-available feature (not opt-in) */
  isCore: boolean;
}

const CORE = ["pwa", "push-notification"];
const AUTH_INCOMPATIBLE: AuthType[] = ["bearer", "custom"];

function buildCheck(
  configKey: string,
  extraCondition?: (config: SwoffConfig) => boolean,
): (config: SwoffConfig) => boolean {
  const keys = configKey.split(".");
  return (config: SwoffConfig) => {
    let obj: unknown = config;
    for (const key of keys) {
      if (obj == null || typeof obj !== "object") return false;
      obj = (obj as Record<string, unknown>)[key];
    }
    if (extraCondition) return !!obj && extraCondition(config);
    return !!obj;
  };
}

export const FEATURES: Record<string, FeatureDef> = {
  pwa: {
    id: "pwa",
    label: "PWA Install Prompt",
    description: "PWA install prompt, update notification, and manifest generation",
    requires: [],
    incompatibleAuthTypes: [],
    checkEnabled: buildCheck("features.pwa.enabled"),
    configUpdate: { pwa: { enabled: true } },
    isCore: true,
  },
  auth: {
    id: "auth",
    label: "Authentication",
    description: "Auth token management, session refresh, and protected routes",
    requires: [],
    incompatibleAuthTypes: [],
    checkEnabled: buildCheck("features.auth.enabled"),
    configUpdate: { auth: { enabled: true, type: "cookie" } },
    isCore: false,
  },
  "mutation-queue": {
    id: "mutation-queue",
    label: "Mutation Queue",
    description: "Queue POST/PUT/DELETE mutations when offline and replay when online",
    requires: [],
    incompatibleAuthTypes: [],
    checkEnabled: buildCheck("features.mutationQueue.enabled"),
    configUpdate: {
      mutationQueue: {
        enabled: true,
        batchSize: 1,
        batchDelayMs: 0,
        backgroundSync: false,
        retry: { maxRetries: 5, backoffMs: 1000, maxBackoffMs: 30000, jitterMs: 250 },
      },
    },
    isCore: false,
  },
  "background-sync": {
    id: "background-sync",
    label: "Background Sync",
    description: "Synchronize queued mutations using the Background Sync API when connectivity returns",
    requires: ["mutation-queue"],
    incompatibleAuthTypes: AUTH_INCOMPATIBLE,
    checkEnabled: (config) => {
      const mq = config.features.mutationQueue;
      if (!mq || !mq.backgroundSync || !mq.enabled) return false;
      const a = config.features.auth;
      return !a || !a.enabled || a.type === "cookie";
    },
    configUpdate: { mutationQueue: { enabled: true, backgroundSync: true } },
    isCore: false,
  },
  graphql: {
    id: "graphql",
    label: "GraphQL",
    description: "GraphQL endpoint integration with tag-based cache invalidation",
    requires: [],
    incompatibleAuthTypes: [],
    checkEnabled: buildCheck("features.graphql.enabled"),
    configUpdate: { graphql: { enabled: true, endpoints: ["/graphql"] } },
    isCore: false,
  },
  "push-notification": {
    id: "push-notification",
    label: "Push Notifications",
    description: "Web Push API notifications with SW push event handling",
    requires: [],
    incompatibleAuthTypes: [],
    checkEnabled: buildCheck("features.pushNotifications"),
    configUpdate: { pushNotifications: true, vapidPublicKey: "" },
    isCore: true,
  },
  "server-push": {
    id: "server-push",
    label: "Server Push",
    description: "Real-time server push over SSE or WebSocket for live cache invalidation",
    requires: [],
    incompatibleAuthTypes: AUTH_INCOMPATIBLE,
    checkEnabled: (config) => {
      const sp = config.features.serverPush;
      if (!sp || !sp.enabled) return false;
      const a = config.features.auth;
      return !a || !a.enabled || a.type === "cookie";
    },
    configUpdate: {
      serverPush: {
        enabled: true,
        type: "sse",
        endpoint: "/api/events",
        reconnectDelayMs: 5000,
      },
    },
    isCore: false,
  },
};

export function getFeature(id: string): FeatureDef | undefined {
  return FEATURES[id];
}

/**
 * Resolve all transitive dependencies of the given features.
 * Returns the full set of feature IDs needed (including the inputs).
 */
export function resolveDependencies(featureIds: string[]): string[] {
  const resolved = new Set<string>();
  function walk(ids: string[]) {
    for (const id of ids) {
      if (resolved.has(id)) continue;
      resolved.add(id);
      const feature = FEATURES[id];
      if (feature) walk(feature.requires);
    }
  }
  walk(featureIds);
  return [...resolved];
}

/**
 * Returns the subset of featureIds that has an auth type conflict
 * with the given config.
 */
export function getAuthConflicts(
  featureIds: string[],
  config: SwoffConfig,
): string[] {
  if (!config.features.auth.enabled) return [];
  const authType = config.features.auth.type;
  return featureIds.filter((id) => {
    const feature = FEATURES[id];
    return feature && feature.incompatibleAuthTypes.includes(authType);
  });
}

/**
 * Build a config update object that enables the given features (with deps).
 * Does NOT handle auth conflicts — caller should check those first.
 */
export function buildConfigUpdate(featureIds: string[]): Record<string, unknown> {
  const ids = resolveDependencies(featureIds);
  const merged: Record<string, unknown> = {};
  for (const id of ids) {
    const feature = FEATURES[id];
    if (feature) {
      deepMergeInto(merged, feature.configUpdate);
    }
  }
  return merged;
}

function deepMergeInto(target: Record<string, unknown>, source: Record<string, unknown>): void {
  for (const key of Object.keys(source)) {
    const sv = source[key];
    const tv = target[key];
    if (
      sv && typeof sv === "object" && !Array.isArray(sv) &&
      tv && typeof tv === "object" && !Array.isArray(tv)
    ) {
      deepMergeInto(tv as Record<string, unknown>, sv as Record<string, unknown>);
    } else {
      target[key] = sv;
    }
  }
}
