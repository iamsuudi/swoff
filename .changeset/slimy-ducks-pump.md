---
"@swoff/cli": minor
---

refactor: rename config.build.outputDir to swOutput, add swoffPath field

refactor: change SW generator extension from .js to .mjs

feat: add CACHE_NAME placeholder to no-bundler SW template (fixes ReferenceError)

feat: add excludeDirs/excludeFiles to PrecacheDirConfig for fine-grained precache control

feat: add build.swUrl to allow custom service worker registration URL
