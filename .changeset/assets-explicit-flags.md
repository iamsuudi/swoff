---
"@swoff/assets": minor
---

Asset generation is now explicit-only: `--android` adds the Android adaptive launcher stack and `--splash` adds the Apple splash screens (replacing the old `--no-splash` opt-out). The default output is now 13 files (icons, favicons, OG image, manifest, head tags, audit page), up to 50 with the opt-in flags. Programmatic `appleSplash` and the new `android` option now default to off.