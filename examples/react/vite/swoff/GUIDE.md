# Swoff — Generated Files

Your project was generated with Swoff. All generated files live in `swoff/`.

## PWA Assets

PWA assets (icons, favicon, OG image, splash screens) will be generated from your
 source logo during `swoff generate`.

To regenerate manually:

  npx @swoff/assets-generator --source <path> [options]

Or use the swoff CLI:

  swoff generate-assets

### What gets generated

- PWA icons: 64×64, 192×192, 512×512, maskable 512×512
- Apple touch icon: 180×180
- Apple splash screens: all device resolutions
- Favicon: SVG + ICO (16×16, 32×32, 48×48)
- OG image: 1200×630 (also used for Twitter card)

After generation, reference these assets in your app manually. Run `swoff generate-assets` for a copy-paste guide with the exact <link> and <meta> tags.

### Source logo requirements

- **SVG** recommended — produces the best quality at all sizes
- PNG or JPG accepted — will be upscaled if needed
- Minimum 512×512 for crisp icons
- Transparent backgrounds work well with theme colors

For the full documentation, visit:

- **Documentation** — https://swoff.dev/docs

- **CLI Reference** — `swoff generate`, `swoff validate`, etc. See [CLI.md](./CLI.md)
