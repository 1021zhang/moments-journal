# Official Sticker Pack Template

This document defines the long-term presentation standard for every official sticker pack.

## Cover asset

- Canvas: **1200 × 900 px**
- Aspect ratio: **4:3 landscape**
- Format: PNG
- Filename: `package.png` (preferred) or `cover.png`
- Background: solid white `#FFFFFF`
- Safe area: at least **80 px** on every edge
- Package placement: centered and fully visible
- Recommended package width: 85%–92% of the canvas when its proportions allow it
- Do not crop, stretch, rotate, or push the package against an edge
- Do not use black, tinted, gradient, photographic, or scene backgrounds

The cover contains only the package artwork. Pack title, description, and sticker count below the cover are rendered by the app. Text that is physically part of the package artwork may remain in the package image.

## App rendering

The app uses one shared rule for all official packs:

```css
aspect-ratio: 4 / 3;
object-fit: contain;
object-position: center;
```

The metadata area is fixed at 50 px and must not depend on the source image dimensions.

## Naming and folders

Use lowercase kebab-case for pack and sticker IDs:

```text
assets/sticker-packs/<pack-id>/
├── package.png
├── sticker-01.png
├── sticker-02.png
└── ...
```

Sticker images should be transparent PNG files. Every sticker needs a stable, unique `id`, a human-readable `name`, and its asset path.

## Adding a pack

1. Create `assets/sticker-packs/<pack-id>/`.
2. Export a 1200 × 900 `package.png` using the cover rules above.
3. Add the transparent sticker PNG files.
4. Add one `createOfficialStickerPack(...)` entry in `sticker-packs.js`.
5. Verify the package card, detail grid, and canvas insertion.
6. Add the package cover to the app-shell cache in `service-worker.js` and bump the cache version.

No page component changes should be required.

## Release checklist

- Cover is exactly 1200 × 900
- Background is solid white
- Complete package is visible with safe margins
- No metadata bar is baked into the cover
- Title, subtitle, and count align with existing cards
- Detail stickers match the package contents
- Clicking a sticker inserts it into the canvas
- `npm run build` passes
