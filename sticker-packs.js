/** @typedef {{ id: string, image: string }} StickerItem */
/** @typedef {{ id: string, title: string, packageImage: string, stickers: StickerItem[] }} StickerPack */

function createOfficialStickerPack(id, title, packageImage, images) {
  return {
    id,
    title,
    packageImage,
    stickers: images.map((image, index) => ({ id: `${id}-${index + 1}`, image }))
  };
}

/** @type {StickerPack[]} */
const officialStickerPacks = [
  createOfficialStickerPack(
    "moments-pack-01",
    "Moments Pack 01",
    "assets/sticker-packs/moments-pack-01/package.png",
    ["⏰", "🪑", "💡", "🧸", "🍼", "🧱", "today", "good day"]
  )
];
