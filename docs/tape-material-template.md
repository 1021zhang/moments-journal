# Official Tape Material Template

This document is the V1 contract for every official Tape in Moments. Read and follow it before adding or replacing a Tape resource.

## Tape Card

Materials renders every official Tape through the shared `materialTapeCard(tape)` template in `app.js`. The card renders its product content from `id`, `rollPreview`, `name`, and `subtitle`; it uses the shared `texture` only for the generic pick-up feedback. It must never contain a Tape-specific class, layout rule, or image treatment.

- Width: `100%`
- Minimum height: `280px` on standard iPhone widths; it may reduce to `248px` on narrow screens while retaining the same 60/40 composition
- Border radius: `28px`
- Padding: `24px`, responsively reduced on narrow screens
- Preview area: 60% of the card width
- Copy area: 40% of the card width
- Preview and copy are vertically centered; cards use the same shelf gap
- English name: semibold, maximum two lines
- Chinese subtitle: regular, lower-contrast gray, maximum two lines

The preview uses `object-fit: contain`. Do not crop or stretch a roll preview, and do not compensate for an incorrectly proportioned asset with Tape-specific CSS.

## Roll-preview artwork

`roll-preview.png` exists only for the Materials library. It is never used while placing Tape on the canvas.

- Format: transparent RGBA PNG; do not bake in a white card, colored background, or heavy shadow
- Keep equal transparent safety margins on all sides
- The roll should visually occupy 65%–75% of the preview area height
- Keep the roll diameter consistent across the official collection
- Show a clear, shallow kraft-paper core and visible coiled tape layers
- Pull the tail naturally from the roll, about **1.2× the roll diameter** long
- Give the tail a modest irregular torn edge; it must not read as a plain rectangle
- Use a soft, light shadow only; the app adds the shared presentation shadow
- Keep pattern colors slightly muted so the paper texture and translucency remain visible

## Official resource directory

Every Tape has one kebab-case folder. The current project uses SVG for the repeat texture and end caps; future tapes must keep that format unless the shared renderer is deliberately upgraded.

```text
assets/tapes/<tape-id>/
├── manifest.json
├── roll-preview.png
├── texture.svg
├── left-cap.svg
└── right-cap.svg
```

`manifest.json` is the canonical record for the resource fields. Its values must match the registered Tape configuration:

```json
{
  "id": "blue-bird",
  "type": "tape",
  "name": "Blue Bird Washi Tape",
  "subtitle": "蓝色小鸟花纹胶带",
  "rollPreview": "roll-preview.png",
  "texture": "texture.svg",
  "leftCap": "left-cap.svg",
  "rightCap": "right-cap.svg",
  "opacity": 0.85
}
```

The registered Tape object always resolves to:

```js
{
  id,
  type: "tape",
  name,
  subtitle,
  rollPreview,
  texture,
  leftCap,
  rightCap,
  opacity
}
```

`texture`, `leftCap`, and `rightCap` are placement resources. Do not substitute `rollPreview` for any of them.

## Adding an official Tape

1. Copy the folder structure above into `assets/tapes/<new-tape-id>/`.
2. Create the transparent `roll-preview.png` to the artwork rules above.
3. Export the repeat texture and the two end caps without stretching the pattern.
4. Fill in `manifest.json` with the correct ID, names, filenames, and default opacity.
5. Add one `createOfficialTapeAsset({ id, name, subtitle, opacity })` entry to `officialTapeAssets` in `sticker-packs.js`. The shared factory resolves the standard resource paths.
6. Add the four render resources and the manifest to `APP_SHELL` in `service-worker.js`, then bump the cache version.
7. Verify the Tape card in Materials and place one tape on the canvas.

No Tape Card markup, CSS, gesture code, or Sticker code should be changed when adding a normal official Tape.

## Release checklist

- [ ] Resource directory and filenames match the template
- [ ] `manifest.json` matches the registered asset config
- [ ] Preview PNG has transparency, consistent safe margins, a clear core, coiled layers, and a 1.2× tail
- [ ] Tape Card uses the shared 60/40 layout with no Tape-specific CSS
- [ ] `rollPreview` is used only in Materials
- [ ] Canvas placement uses `texture`, `leftCap`, and `rightCap`
- [ ] Placement length, angle, selection, move, scale, rotate, and delete still work
- [ ] Sticker library is unchanged
- [ ] `npm run build` passes
