# Full Codebase Scan — Bugs, Inconsistencies & Code Smells

## ✅ Resolved

- **C1** — Added `async` to WebSocket `onmessage` callback
- **C2** — Changed `_` to `event` in `fetchWithPreload` fallback
- **C3** — Added `networkOnlyStrategy` handler to `STRATEGY_HANDLERS`, removed silent `return;`
- **C4** — client-injector now uses `shouldIncludeServerPush()` — all three gating paths agree
- **C5** — Added 10s timeout to `resetSwoff` MessageChannel handshake
- **C6** — Replaced `url.includes(path)` with `new URL(url).pathname` exact matching in `isAuthUrl`
- **C7** — Added `db.close()` to all 6 leaking IDB functions in `mutation-queue.ts` and `push.ts`
- **C9** — Wrapped `refetchEntry(url)` in try-catch so resolvers always fire
- **C10** — Guarded `AbortSignal.timeout` with `createTimeoutSignal` fallback
- **C12** — Changed `stripped.charAt(0).toLowerCase() + stripped.slice(1)` to `stripped.toLowerCase()` in GQL `tagsFromOpName`
- **C14** — Changed `queueRefresh(request.url)` to `queueRefresh(cacheKey(request))` in SWR strategy
- **M8** — storage-notify now always generated (was wrongly gated on pushNotifications)
- **M1-M4** — version validated, refetchQueue validated, framework type checked, deepMerge falsy fix
- **M5** — zero reconnectDelayMs broken-wait fixed (Math.max(1000, ...))
- **M6** — **False positive** — listener chain is self-healing
- **M7** — openDB accepts optional version parameter (defaults to 1)
- **M9** — collectAssets existsSync guard added
- **M10** — generateTags try-catch for non-browser environments
- **M11** — SW bypass routes use pathname matching (not substring includes)
- **M13** — **By design** — non-GET without explicit cache key passes through to browser
- **M14** — Added 7 missing WindowEventMap declarations
- **S1** — isAuthFailureResponse no longer async
- **S2** — Added var declarations to REACTIVE globals in fetch-handler
- **S3** — Strategy errors logged via swLog
- **S4** — COOKIE_AUTH_TYPES duplication removed from background-sync-handler (uses string comparison directly)
- **S5** — scheduleReconnect missing from SSE branch (ReferenceError); now added
- **S6** — Consistent IDB close pattern in tag-management (all use tx.oncomplete callback)
- **S7** — Consistent optional chaining in message-handler
- **S8** — Single self.clients.matchAll in install-handler (2×N → N)
- **S9** — Promise.all in cache eviction wrapped in try-catch
- **S10** — applySwSections hoisted outside if/else in assemble-sw.ts
- **S11** — Double index.getAll() merged into single call
- **S12** — _fetchingUser changed to module-level let
- **S13** — Duplicate tags key removed from JSDoc
- **S14** — No-op .replace() calls removed from sw-template
- **S15** — readFileSync replaced with readFile (fs/promises) in async sw-generator.ts
- **S17** — Minimum reconnect delay enforced in server-push handler
- **S18** — Dead `!== false` check removed
- **S19** — Config header expanded with all feature flags
- **S20** — --debug flag forwarded in standalone CLI entry point
- **S21** — broadcastToClients awaited in background-sync loop
- **S22** — Dead isAuthUrl import removed from fetch-wrapper
- **S23** — Dead authUrlsBlock variable removed
- **M12** — network-only added to STRATEGY_HANDLERS (as C3)
- **Structural fix** — Created `FeatureRegistry` (`shared/feature-registry.ts`) as single source of truth for feature dependencies, conflicts, and gating. `swoff add` resolves transitive deps, rejects auth conflicts. Auth default changed from bearer to cookie.

## 🔴 False Positives (discarded)

- **C8** — IDB request errors DO bubble to transaction `onerror` (no request-level handlers attached). Transaction aborts correctly. ✓
- **C11** — `debouncedInvalidate` promises are tied to SW lifecycle via `event.waitUntil`. SW termination destroys scope (no leak). ✓
- **C13** — Greedy `([\s\S]*)` backtracks correctly against `\n\}` anchor. Only the function's closing `}` (no leading whitespace) matches. ✓

## 🔴 Open Critical/High Bugs

---

## 🟡 Medium Bugs / Inconsistencies
*(All resolved)*

---

## 🟢 Code Smells
*(S1-S15, S17-S23 resolved. S16 skipped — architectural.)*
