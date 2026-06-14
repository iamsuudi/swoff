import { describe, it, expect } from "vitest";
import { validateConfig } from "../lib/config/validator.js";

describe("validateConfig", () => {
  const validConfig: Record<string, any> = {
    features: {
      pwa: { enabled: true, preventDefaultInstall: false },
      serviceWorker: {
        version: "package",
        autoActivate: false,
        strategy: {
          default: "cache-first",
          patterns: {},
          reactive: {
            defaults: {
              staleTime: 0,
              refetchInterval: 0,
              refetchOnReconnect: false,
              refetchOnFocus: false,
            },
          },
        },
        navigation: {
          mode: "spa",
          fallback: "/index.html",
        },
      },
      refetchQueue: {
        batchSize: 5,
        batchDelayMs: 1000,
        maxRetries: 3,
        retryDelayMs: 1000,
      },
      mutationQueue: { enabled: false, batchSize: 1, batchDelayMs: 0, maxRetries: 5, retryBackoffMs: 1000 },
      auth: { enabled: false, type: "bearer" },
      tagInvalidation: { crossTabSync: true },
      graphql: { enabled: false, endpoints: ["/graphql"] },
    },
    build: { outputDir: "dist", swFilename: "sw" },
  };

  describe("required fields", () => {
    it("passes valid config", () => {
      const errors = validateConfig(validConfig);
      expect(errors).toEqual([]);
    });

    it("fails when features is missing", () => {
      const { features: _, ...rest } = validConfig;
      const errors = validateConfig(rest as Record<string, unknown>);
      expect(errors[0]).toContain("Missing required fields");
    });

    it("fails when build is missing", () => {
      const { build: _, ...rest } = validConfig;
      const errors = validateConfig(rest as Record<string, unknown>);
      expect(errors[0]).toContain("Missing required fields");
    });
  });

  describe("serviceWorker validation", () => {
    it("rejects invalid autoActivate type", () => {
      const cfg = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, autoActivate: 1 } },
      };
      const errors = validateConfig(cfg as unknown as Record<string, unknown>);
      expect(errors).toContain("features.serviceWorker.autoActivate must be a boolean");
    });

    it("rejects invalid default strategy", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, strategy: { ...validConfig.features.serviceWorker.strategy, default: "magic-cache" } } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("Invalid features.serviceWorker.strategy.default");
    });

    it("rejects invalid strategy in patterns", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, strategy: { ...validConfig.features.serviceWorker.strategy, patterns: { "/api/*": "invalid" } } } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("Invalid strategy");
    });

    it("rejects staleTime on non-reactive strategy", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, strategy: { ...validConfig.features.serviceWorker.strategy, patterns: { "/api/*": { strategy: "cache-first", staleTime: 30 } } } } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain('staleTime is only valid with "reactive" strategy');
    });

    it("rejects refetchInterval on non-reactive strategy", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, strategy: { ...validConfig.features.serviceWorker.strategy, patterns: { "/api/*": { strategy: "stale-while-revalidate", refetchInterval: 15 } } } } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain('refetchInterval is only valid with "reactive" strategy');
    });

    it("accepts reactive strategy with all reactive fields", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, strategy: { ...validConfig.features.serviceWorker.strategy, patterns: { "/api/*": { strategy: "reactive", staleTime: 30, refetchInterval: 15, refetchOnFocus: true, refetchOnReconnect: true } } } } },
      };
      const errors = validateConfig(config);
      expect(errors).toEqual([]);
    });

    it("rejects invalid staleTime on reactive strategy", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, strategy: { ...validConfig.features.serviceWorker.strategy, patterns: { "/api/*": { strategy: "reactive", staleTime: -5 } } } } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("staleTime must be a non-negative number");
    });

    it("accepts all valid strategies", () => {
      const strategies = ["cache-first", "network-first", "stale-while-revalidate", "cache-only", "network-only", "reactive"];
      for (const strategy of strategies) {
        const config = {
          ...validConfig,
          features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, strategy: { ...validConfig.features.serviceWorker.strategy, default: strategy } } },
        };
        const errors = validateConfig(config);
        expect(errors).toEqual([]);
      }
    });
  });

  describe("navigation validation", () => {
    it('accepts "ssr", "spa", and "default" navigation modes', () => {
      const configSsr = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, navigation: { mode: "ssr", fallback: "/index.html" } } },
      };
      const configSpa = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, navigation: { mode: "spa", fallback: "/index.html" } } },
      };
      const configDefault = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, navigation: { mode: "default", fallback: "/index.html" } } },
      };
      expect(validateConfig(configSsr)).toEqual([]);
      expect(validateConfig(configSpa)).toEqual([]);
      expect(validateConfig(configDefault)).toEqual([]);
    });

    it("rejects invalid navigation mode", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, navigation: { mode: "invalid", fallback: "/index.html" } } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("navigation.mode");
    });

    it("rejects non-array precacheRoutes", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, navigation: { mode: "spa", fallback: "/index.html", precacheRoutes: "/about" } } },
      };
      const errors = validateConfig(config as unknown as Record<string, unknown>);
      expect(errors[0]).toContain("precacheRoutes must be an array");
    });

    it("rejects precacheRoutes with non-string elements", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, navigation: { mode: "spa", fallback: "/index.html", precacheRoutes: [123] } } },
      };
      const errors = validateConfig(config as unknown as Record<string, unknown>);
      expect(errors[0]).toContain("precacheRoutes must be an array");
    });

    it("rejects non-array rules", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, navigation: { mode: "spa", fallback: "/index.html", rules: "not-an-array" } } },
      };
      const errors = validateConfig(config as unknown as Record<string, unknown>);
      expect(errors[0]).toContain("navigation.rules must be an array");
    });

    it("validates rules[].match is a non-empty string", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, navigation: { mode: "spa", fallback: "/index.html", rules: [{ match: "" }] } } },
      };
      const errors = validateConfig(config as unknown as Record<string, unknown>);
      expect(errors[0]).toContain("match must be a non-empty string");
    });

    it("validates rules[].fallback is a string", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, navigation: { mode: "spa", fallback: "/index.html", rules: [{ match: "/blog/*", fallback: 123 }] } } },
      };
      const errors = validateConfig(config as unknown as Record<string, unknown>);
      expect(errors[0]).toContain("fallback must be a string");
    });

    it("accepts valid rules", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, navigation: { mode: "spa", fallback: "/index.html", rules: [
          { match: "/blog/*", fallback: "/blog-offline.html" },
          { match: "/dashboard/**", fallback: "/dashboard-offline.html" },
          { match: "/api/status" },
          { match: "/notes/**" },
        ] } } },
      };
      expect(validateConfig(config)).toEqual([]);
    });
  });

  describe("version validation", () => {
    it('accepts "package" version', () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, version: "package" } },
      };
      expect(validateConfig(config)).toEqual([]);
    });

    it('accepts "hash" version', () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, version: "hash" } },
      };
      expect(validateConfig(config)).toEqual([]);
    });

    it("accepts any string as version", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, version: "anything" } },
      };
      expect(validateConfig(config)).toEqual([]);
    });

    it("rejects version with wrong type", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, serviceWorker: { ...validConfig.features.serviceWorker, version: true as unknown as string } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain("features.serviceWorker.version must be a string");
    });
  });

  describe("features validation", () => {
    it("rejects unknown features", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, unknownFeature: true },
      };
      const errors = validateConfig(config);
      expect(errors).toContain('Unknown feature "unknownFeature"');
    });

    it("rejects boolean for object feature pwa", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, pwa: true },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain('Feature "pwa" must be an object');
    });

    it("rejects boolean for object feature mutationQueue", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, mutationQueue: true },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain('Feature "mutationQueue" must be an object');
    });

    it("accepts object feature pwa", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, pwa: { enabled: true, preventDefaultInstall: false } },
      };
      expect(validateConfig(config)).toEqual([]);
    });

    it("validates pwa.enabled is boolean", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, pwa: { enabled: "yes", preventDefaultInstall: false } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("features.pwa.enabled must be a boolean");
    });

    it("validates pwa.preventDefaultInstall is boolean", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, pwa: { enabled: true, preventDefaultInstall: "true" } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("features.pwa.preventDefaultInstall must be a boolean");
    });

    it("rejects backgroundSync without mutationQueue enabled", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, mutationQueue: { enabled: false, batchSize: 1, batchDelayMs: 0, maxRetries: 5, retryBackoffMs: 1000, backgroundSync: true } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("features.mutationQueue.backgroundSync requires mutationQueue to be enabled");
    });

    it("passes backgroundSync with mutationQueue enabled", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, mutationQueue: { enabled: true, batchSize: 5, batchDelayMs: 500, maxRetries: 3, retryBackoffMs: 2000, backgroundSync: true } },
      };
      const errors = validateConfig(config);
      expect(errors).toEqual([]);
    });

    it("validates mutationQueue.batchSize must be a positive integer", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, mutationQueue: { enabled: true, batchSize: 0 } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("features.mutationQueue.batchSize must be a positive integer");
    });

    it("validates mutationQueue.retry.maxRetries must be a non-negative integer", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, mutationQueue: { enabled: true, retry: { maxRetries: -1 } } },
      };
      const errors = validateConfig(config as unknown as Record<string, unknown>);
      expect(errors[0]).toContain("mutationQueue.retry.maxRetries must be a non-negative integer");
    });

    it("validates auth.enabled is boolean", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, auth: { enabled: "yes", type: "bearer" } },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("features.auth.enabled must be a boolean");
    });

    it("validates auth.type is valid", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, auth: { enabled: true, type: "invalid" } },
      };
      const errors = validateConfig(config);
      expect(errors[0]).toContain('features.auth.type must be one of');
    });

    it("accepts better-auth type", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, auth: { enabled: true, type: "better-auth" } },
      };
      expect(validateConfig(config)).toEqual([]);
    });

    it("accepts next-auth type", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, auth: { enabled: true, type: "next-auth" } },
      };
      expect(validateConfig(config)).toEqual([]);
    });

    it("accepts clerk type", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, auth: { enabled: true, type: "clerk" } },
      };
      expect(validateConfig(config)).toEqual([]);
    });

    it("accepts supabase type", () => {
      const config = {
        ...validConfig,
        features: { ...validConfig.features, auth: { enabled: true, type: "supabase" } },
      };
      expect(validateConfig(config)).toEqual([]);
    });
  });

  describe("build validation", () => {
    it("rejects non-string outputDir", () => {
      const config = {
        ...validConfig,
        build: { ...validConfig.build, outputDir: 123 },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("build.outputDir must be a non-empty string");
    });

    it("rejects non-string swFilename", () => {
      const config = {
        ...validConfig,
        build: { ...validConfig.build, swFilename: true },
      };
      const errors = validateConfig(config);
      expect(errors).toContain("build.swFilename must be a non-empty string");
    });

    describe("precacheDirs", () => {
      it("rejects string values (must be objects)", () => {
        const config = {
          ...validConfig,
          build: { ...validConfig.build, precacheDirs: { ".next/static": "/_next/static" } },
        };
        const errors = validateConfig(config);
        expect(errors[0]).toContain('precacheDirs[".next/static"] must be an object');
      });

      it("accepts object config with prefix, extensions, stripExtension", () => {
        const config = {
          ...validConfig,
          build: {
            ...validConfig.build,
            precacheDirs: {
              ".next/static": { prefix: "/_next/static" },
              ".next/server/app": {
                prefix: "",
                extensions: [".html"],
                stripExtension: true,
              },
            },
          },
        };
        expect(validateConfig(config)).toEqual([]);
      });

      it("accepts object config with only prefix (minimum)", () => {
        const config = {
          ...validConfig,
          build: {
            ...validConfig.build,
            precacheDirs: { "some-dir": { prefix: "/prefix" } },
          },
        };
        expect(validateConfig(config)).toEqual([]);
      });

      it("rejects object config without prefix field", () => {
        const config = {
          ...validConfig,
          build: {
            ...validConfig.build,
            precacheDirs: { "some-dir": { extensions: [".html"] } },
          },
        };
        const errors = validateConfig(config);
        expect(errors[0]).toContain('precacheDirs["some-dir"].prefix must be a string');
      });

      it("rejects object config with non-array extensions", () => {
        const config = {
          ...validConfig,
          build: {
            ...validConfig.build,
            precacheDirs: { "some-dir": { prefix: "", extensions: ".html" } },
          },
        };
        const errors = validateConfig(config);
        expect(errors[0]).toContain('precacheDirs["some-dir"].extensions must be an array of strings');
      });

      it("rejects object config with non-boolean stripExtension", () => {
        const config = {
          ...validConfig,
          build: {
            ...validConfig.build,
            precacheDirs: { "some-dir": { prefix: "", stripExtension: "yes" } },
          },
        };
        const errors = validateConfig(config);
        expect(errors[0]).toContain('precacheDirs["some-dir"].stripExtension must be a boolean');
      });

      it("accepts object config with stripSuffixes", () => {
        const config = {
          ...validConfig,
          build: {
            ...validConfig.build,
            precacheDirs: { "some-dir": { prefix: "", stripSuffixes: ["index", "page"] } },
          },
        };
        expect(validateConfig(config)).toEqual([]);
      });

      it("rejects object config with non-array stripSuffixes", () => {
        const config = {
          ...validConfig,
          build: {
            ...validConfig.build,
            precacheDirs: { "some-dir": { prefix: "", stripSuffixes: "index" } },
          },
        };
        const errors = validateConfig(config);
        expect(errors[0]).toContain('precacheDirs["some-dir"].stripSuffixes must be an array of strings');
      });

      it("rejects non-object value", () => {
        const config = {
          ...validConfig,
          build: {
            ...validConfig.build,
            precacheDirs: { "some-dir": 123 },
          },
        };
        const errors = validateConfig(config);
        expect(errors[0]).toContain('precacheDirs["some-dir"] must be an object');
      });
    });
  });
});
