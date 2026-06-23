/** @typedef {{ id: string, name?: string, image: string }} StickerItem */
/** @typedef {{ id: string, title: string, subtitle: string, packageImage: string, stickers: StickerItem[] }} StickerPack */

function createOfficialStickerPack(id, title, subtitle, packageImage, stickers) {
  return {
    id,
    title,
    subtitle,
    packageImage,
    stickers
  };
}

function createStickerItems(directory, definitions) {
  return definitions.map(([id, name]) => ({
    id,
    name,
    image: `${directory}/${id}.png`
  }));
}

const catY2KPackStickers = createStickerItems(
  "assets/sticker-packs/cat-y2k-pack",
  [
    ["kuku", "Kuku"],
    ["dancing-flower", "Dancing Flower"],
    ["no-more-work", "No More Work"],
    ["no-bug", "No Bug"],
    ["kiki", "Kiki"],
    ["croc-y2k", "Croc Y2K"],
    ["blur", "Blur"],
    ["sexy-peach", "Sexy Peach"],
    ["allergic", "Allergic"],
    ["fragile", "Fragile"],
    ["escape", "Escape"],
    ["cat-y2k-circle", "Cat Y2K Circle"],
    ["one-of-the-cats", "One of the Cats"],
    ["berry-cat", "Berry Cat"],
    ["awake", "Awake"],
    ["angel", "Angel"],
    ["music-lover", "Music Lover"],
    ["dj-cat", "DJ Cat"],
    ["cat-y2k-duo", "Cat Y2K Duo"],
    ["lucky-cat", "Lucky Cat"],
    ["arigathanks", "Arigathanks"],
    ["lucky-star", "Lucky Star"],
    ["eatadakimasu", "Eatadakimasu"],
    ["love", "Love"],
    ["sleepy-cats", "Sleepy Cats"],
    ["i-love-my-job", "I Love My Job"],
    ["bigguy", "Bigguy"],
    ["pink-heart-cat", "Pink Heart Cat"],
    ["green-flower-cat", "Green Flower Cat"],
    ["red-circle-cat", "Red Circle Cat"]
  ]
);

const positiveTalkPackStickers = createStickerItems(
  "assets/sticker-packs/positive-talk-pack",
  [
    ["positive-breathe", "Breathe"],
    ["positive-small-steps", "Small Steps"],
    ["positive-good-things", "Good Things"],
    ["positive-begin-again", "Begin Again"],
    ["positive-rest-process", "Rest Process"],
    ["positive-good-pace", "Good Pace"],
    ["positive-soft-hearts", "Soft Hearts"],
    ["positive-today-enough", "Today Enough"],
    ["positive-trust-timing", "Trust Timing"],
    ["positive-kindness", "Kindness"],
    ["positive-more-light", "More Light"],
    ["positive-keep-going", "Keep Going"]
  ]
);

const worldCupStarPackStickers = createStickerItems(
  "assets/sticker-packs/world-cup-star-pack",
  [
    ["world-cup-messi-card", "Messi Card"],
    ["world-cup-vinicius-card", "Vinicius Jr Card"],
    ["world-cup-mbappe-card", "Mbappe Card"],
    ["world-cup-bellingham-card", "Bellingham Card"],
    ["world-cup-yamal-card", "Lamine Yamal Card"],
    ["world-cup-ronaldo-card", "Ronaldo Card"],
    ["world-cup-musiala-card", "Musiala Card"],
    ["world-cup-dembele-card", "Dembele Card"],
    ["world-cup-football", "Football"],
    ["world-cup-trophy", "Trophy"],
    ["world-cup-stars-logo", "World Cup Stars"],
    ["world-cup-card-pack", "Card Pack"]
  ]
);

// Official sticker pack cover spec:
// 1200x900, 4:3, transparent background, safe area 80px, object-fit contain.
/** @type {StickerPack[]} */
const officialStickerPacks = [
  createOfficialStickerPack(
    "moments-pack-01",
    "Moments Pack 01",
    "Daily Moments",
    "assets/sticker-packs/moments-pack-01/package.png",
    [
      { id: "clock", image: "assets/sticker-packs/moments-pack-01/clock.png" },
      { id: "stool", image: "assets/sticker-packs/moments-pack-01/stool.png" },
      { id: "lamp", image: "assets/sticker-packs/moments-pack-01/lamp.png" },
      { id: "bear", image: "assets/sticker-packs/moments-pack-01/bear.png" },
      { id: "bottle", image: "assets/sticker-packs/moments-pack-01/bottle.png" },
      { id: "blocks", image: "assets/sticker-packs/moments-pack-01/blocks.png" },
      { id: "today-label", image: "assets/sticker-packs/moments-pack-01/today-label.png" },
      { id: "goodday-label", image: "assets/sticker-packs/moments-pack-01/goodday-label.png" }
    ]
  ),
  createOfficialStickerPack(
    "official-cat-y2k-pack",
    "Cat Y2K Pack",
    "Cute Y2K cat stickers",
    "assets/sticker-packs/cat-y2k-pack/package.png",
    catY2KPackStickers
  ),
  createOfficialStickerPack(
    "official-positive-talk-pack",
    "Positive Talk Pack",
    "Uplifting quote stickers",
    "assets/sticker-packs/positive-talk-pack/package.png",
    positiveTalkPackStickers
  ),
  createOfficialStickerPack(
    "official-world-cup-star-pack",
    "World Cup Star Pack",
    "Football star card stickers",
    "assets/sticker-packs/world-cup-star-pack/package.png",
    worldCupStarPackStickers
  )
];
