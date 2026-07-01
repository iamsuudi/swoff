# @swoff/cli

## 0.4.0

### Minor Changes

- 4593d30: refactor: rename config.build.outputDir to swOutput, add swoffPath field

  refactor: change SW generator extension from .js to .mjs

  feat: add CACHE_NAME placeholder to no-bundler SW template (fixes ReferenceError)

  feat: add excludeDirs/excludeFiles to PrecacheDirConfig for fine-grained precache control

  feat: add build.swUrl to allow custom service worker registration URL

## 0.3.15

### Patch Changes

- f0f8ccf: ci: automate npm publishing via GitHub Actions with Trusted Publisher
