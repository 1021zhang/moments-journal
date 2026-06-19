/** @typedef {{ id: string, image: string }} StickerItem */
/** @typedef {{ id: string, title: string, subtitle: string, coverImage: string, stickers: StickerItem[] }} StickerPack */

function createOfficialStickerPack(id, title, subtitle, coverImage, images) {
  return {
    id,
    title,
    subtitle,
    coverImage,
    stickers: images.map((image, index) => ({ id: `${id}-${index + 1}`, image }))
  };
}

/** @type {StickerPack[]} */
const officialStickerPacks = [
  createOfficialStickerPack(
    "moments-pack-01",
    "Moments Pack 01",
    "Daily Moments",
    "assets/sticker-packs/moments-pack-01/cover.png",
    ["⏰", "🪑", "💡", "🧸", "🍼", "🧱", "today", "good day"]
  )
];
