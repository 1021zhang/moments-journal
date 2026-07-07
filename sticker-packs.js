/** @typedef {{ id: string, name?: string, image: string, aspectRatio?: number, assetType?: string }} StickerItem */
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

function createStickerItems(directory, definitions, cacheVersion = "") {
  const versionSuffix = cacheVersion ? `?v=${encodeURIComponent(cacheVersion)}` : "";
  return definitions.map(([id, name, aspectRatio]) => ({
    id,
    name,
    image: `${directory}/${id}.png${versionSuffix}`,
    aspectRatio,
    assetType: "official-sticker"
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
    ["world-cup-messi-card", "Messi Card", 0.6903],
    ["world-cup-vinicius-card", "Vinicius Jr Card", 0.7053],
    ["world-cup-mbappe-card", "Mbappe Card", 0.7422],
    ["world-cup-bellingham-card", "Bellingham Card", 0.7399],
    ["world-cup-yamal-card", "Lamine Yamal Card", 0.7017],
    ["world-cup-ronaldo-card", "Ronaldo Card", 0.7036],
    ["world-cup-musiala-card", "Musiala Card", 0.755],
    ["world-cup-dembele-card", "Dembele Card", 0.8235],
    ["world-cup-neymar-card", "Neymar Card", 0.6984],
    ["world-cup-kane-card", "Harry Kane Card", 0.697],
    ["world-cup-pedri-card", "Pedri Card", 0.6712],
    ["world-cup-haaland-card", "Erling Haaland Card", 0.6658],
    ["world-cup-son-card", "Son Heung-min Card", 0.6984],
    ["world-cup-football", "Football", 0.9196],
    ["world-cup-trophy", "Trophy", 0.5991],
    ["world-cup-stars-logo", "World Cup Stars", 1.8197],
    ["world-cup-card-pack", "Card Pack", 0.875]
  ],
  "20260624-clean"
);

const urbanZooPackStickers = createStickerItems(
  "assets/sticker-packs/urban-zoo",
  [
    ["gorilla", "Gorilla 大猩猩", 0.8777],
    ["lion", "Lion 狮子", 1.0749],
    ["penguin", "Penguin 企鹅", 0.5482],
    ["cheetah", "Cheetah 猎豹", 1.1367],
    ["panda", "Panda 熊猫", 0.5903],
    ["milk-cow", "Milk Cow 奶牛", 1.0888],
    ["zebra", "Zebra 斑马", 0.7224],
    ["rabbit", "Rabbit 兔子", 0.5894],
    ["cat", "Cat 猫", 0.7747],
    ["puppy", "Puppy 小狗", 0.7233],
    ["animals-label", "Animals 手写标签", 2.0472],
    ["good-day", "Good Day", 1.0333],
    ["doodle-heart", "Doodle Heart", 0.9254],
    ["doodle-star", "Doodle Star", 0.8346]
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
  ),
  createOfficialStickerPack(
    "urban-zoo",
    "Urban Zoo 城市动物园",
    "Black and white doodle animals",
    "assets/sticker-packs/urban-zoo/package.png",
    urbanZooPackStickers
  )
];
