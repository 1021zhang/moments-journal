# Official Sticker Pack Template

This document defines the long-term presentation standard for every official sticker pack.

## Cover asset

- Canvas: **1200 × 900 px**
- Aspect ratio: **4:3 landscape**
- Format: PNG
- Filename: `package.png` (preferred) or `cover.png`
- Background: transparent
- Safe area: at least **80 px** on every edge
- Package placement: centered and fully visible
- Recommended package width: 85%–92% of the canvas when its proportions allow it
- Do not crop, stretch, rotate, or push the package against an edge
- Do not bake white cards, black bars, tinted fields, gradients, photographs, or scenes behind the package

The cover contains only the isolated package artwork. Text that is physically part of the package artwork may remain in the image.

## App rendering

The app uses one shared rule for all official packs:

```css
aspect-ratio: 4 / 3;
object-fit: contain;
object-position: center;
```

The browser displays the transparent package image directly on the glass panel with a subtle drop shadow. It does not render a card background, title, description, or sticker count. The full package button remains the click target in both list and grid modes.

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

Before registering new sticker PNGs, normalize them so the alpha bounds are tight and every asset keeps a small transparent safety margin:

```bash
python3 scripts/normalize-sticker-assets.py \
  assets/sticker-packs/<pack-id>/sticker-01.png \
  assets/sticker-packs/<pack-id>/sticker-02.png
```

Use `--edge-fringe 1 --alpha-threshold 160` only for assets with a visible dark or semitransparent fringe outside the intended white sticker border. Always inspect the result so the script does not remove intentional artwork.

## Adding a pack

1. Create `assets/sticker-packs/<pack-id>/`.
2. Export a 1200 × 900 `package.png` using the cover rules above.
3. Add and normalize the transparent sticker PNG files.
4. Add one `createOfficialStickerPack(...)` entry in `sticker-packs.js`.
5. Verify the package card, detail grid, and canvas insertion.
6. Add the package cover to the app-shell cache in `service-worker.js` and bump the cache version.

No page component changes should be required.

## Release checklist

- Cover is exactly 1200 × 900
- Background is transparent
- Complete package is visible with safe margins
- No card background or metadata bar is baked into the cover
- Browser shows only the package artwork, with no title, subtitle, or count
- Detail stickers match the package contents
- Clicking a sticker inserts it into the canvas
- `npm run build` passes
