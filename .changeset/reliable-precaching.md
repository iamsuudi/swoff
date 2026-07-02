---
"@swoff/cli": patch
---

feat: reliable precaching with asset version tracking and fetch-based resume
fix: batchFailed flag prevents checkpoint advance on partial failures
fix: wrap background precache in event.waitUntil to prevent SW termination
