---
"@swoff/assets": minor
---

Wordmark auto-generation: `--source` is now optional — omit it and a text-derived icon is generated from `--app-name` (with a bitmap-font fallback when no system fonts exist).

Always-on Android adaptive icons: density-scaled `ic_launcher`/`ic_launcher_round` PNGs, a 66% safe-zone foreground, a monochrome layer, `mipmap-anydpi-v26` launcher XMLs, and `values/colors.xml`.

New `pwa-debug.html` audit page, plus new manifest flags `--orientation`, `--scope`, `--lang`, and `--categories`, and a `--print-schema` flag exposing the `swoff-assets.json` JSON schema.

Invalid color hexes, undersized sources, and similar issues now produce non-fatal warnings instead of silently generating wrong output. Generation counts: 36 files by default, up to 50 with monochrome, MS tiles, and dark mode.