# Swoff — Generated Files

Your project was generated with Swoff. All generated files live in `swoff/`.

## PWA Assets

Generate PWA icons, splash screens, favicons, OG image, and manifest.json with:

  npx @swoff/assets --source ./logo.svg

### What gets generated

- PWA icons: 64×64, 192×192, 512×512, maskable 512×512
- Apple touch icon: 180×180
- Apple splash screens: all device resolutions
- Favicon: ICO (16×16, 32×32, 48×48)
- OG image: 1200×630 (also used for Twitter card)
- manifest.json (with icons array, theme/background color, screenshot)

After generation, reference these assets in your HTML <head>. The tool prints the exact <link> and <meta> tags to copy-paste.

For the full documentation, visit:

- **Documentation** — https://swoff.dev/docs

- **CLI Reference** — `swoff generate`, `swoff validate`, etc. See [CLI.md](./CLI.md)
