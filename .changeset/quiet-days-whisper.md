---
"@swoff/cli": patch
---

Versioned precache cache name — avoids wiping cache on unchanged asset lists. Fixed TDZ crash where `ASSETS_TO_CACHE` was referenced before initialization. HTTP errors (404, 5xx) now advance checkpoint; network errors keep checkpoint for retry. Legacy unversioned `"precache"` cache cleaned up on activation.
