const noteStorageKey = "moments-journal.notes";
const localPhotosKey = "moments-journal.photos";
const localElementsKey = "moments-journal.canvas-elements";
const localCustomStickersKey = "moments-journal.custom-stickers";
const dbName = "moments-journal";
const photoStoreName = "photos";
const elementStoreName = "canvasElements";
const customStickerStoreName = "customStickers";
const canvasWidth = 358;
const canvasHeight = 560;
const stackPreviewWidth = 358;
const stackPreviewHeight = 390;
const deleteRevealHeight = 180;
const deleteActiveHeight = 110;
const minItemScale = 0.25;
const maxItemScale = 4;
const minTextScale = 0.4;
const maxTextScale = 3.5;
const pageTransitionMs = 260;
const backupSchemaVersion = 1;
const appVersion = "1.0.0";
const undoLimit = 50;
const textDefaults = {
  fontSize: 20,
  color: "#111111",
  fontWeight: 700,
  backgroundStyle: "none"
};
const textSizeOptions = [
  { label: "小", value: 16 },
  { label: "中", value: 20 },
  { label: "大", value: 26 }
];
const textColorOptions = [
  { label: "黑", value: "#111111" },
  { label: "白", value: "#ffffff" },
  { label: "灰", value: "#8a8a8a" },
  { label: "红", value: "#e8504f" },
  { label: "蓝", value: "#3478f6" }
];
const textBackgroundOptions = [
  { label: "无", value: "none" },
  { label: "白底", value: "white" },
  { label: "半透明", value: "glass" },
  { label: "胶囊", value: "pill" }
];

const mockPhotos = [
  { id: "mock-cafe", type: "mock", caption: "cafe", src: "https://picsum.photos/seed/moments-cafe/320/320" },
  { id: "mock-walk", type: "mock", caption: "walk", src: "https://picsum.photos/seed/moments-walk/320/320" },
  { id: "mock-table", type: "mock", caption: "table", src: "https://picsum.photos/seed/moments-table/320/320" },
  { id: "mock-flowers", type: "mock", caption: "flowers", src: "https://picsum.photos/seed/moments-flowers/320/320" },
  { id: "mock-window", type: "mock", caption: "window", src: "https://picsum.photos/seed/moments-window/320/320" },
  { id: "mock-street", type: "mock", caption: "street", src: "https://picsum.photos/seed/moments-street/320/320" },
  { id: "mock-friends", type: "mock", caption: "friends", src: "https://picsum.photos/seed/moments-friends/320/320" },
  { id: "mock-desk", type: "mock", caption: "desk", src: "https://picsum.photos/seed/moments-desk/320/320" }
];

const state = {
  view: "home",
  activeDayId: "",
  selectedPhotoId: "",
  selectedSurface: "",
  selectedItemType: "",
  activePanel: "",
  stickerSheetState: "collapsed",
  settingsSheetOpen: false,
  isExportingBackup: false,
  isExportingDay: false,
  isReadingClipboard: false,
  stickerImagePickerOpen: false,
  customStickerManageMode: false,
  toast: "",
  toastTimer: null,
  pendingInsertPoint: null,
  pendingPhotoSource: "",
  textComposer: {
    active: false,
    editingId: "",
    value: "",
    fontSize: textDefaults.fontSize,
    color: textDefaults.color,
    fontWeight: textDefaults.fontWeight,
    backgroundStyle: textDefaults.backgroundStyle,
    beforeSnapshot: null
  },
  pendingImportDateKey: "",
  notes: loadNotes(),
  userPhotos: [],
  canvasElements: [],
  customStickers: [],
  db: null,
  storageMode: "indexedDB",
  undoHistory: {}
};

const gesture = {
  active: false,
  mode: "",
  itemId: "",
  itemType: "",
  surface: "",
  startClientX: 0,
  startClientY: 0,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0,
  startFontSize: 0,
  startScale: 1,
  aspectRatio: 1,
  startRotation: 0,
  startAngle: 0,
  startPinchDistance: 0,
  startPinchAngle: 0,
  startPinchCenterX: 0,
  startPinchCenterY: 0,
  pointerId: null,
  capturedElement: null,
  capturedPointers: [],
  overDeleteZone: false,
  dragging: false,
  centerX: 0,
  centerY: 0,
  beforeSnapshot: null
};

const activePointers = new Map();
let isPageTransitioning = false;
let canvasSafetyRepairFrame = 0;
const dayPress = {
  element: null,
  dayId: "",
  pointerId: null
};
const stickerSheetDrag = {
  active: false,
  pointerId: null,
  startY: 0,
  startState: "collapsed",
  startHeight: 0,
  currentHeight: 0,
  currentOffset: 0,
  ignoreNextToggle: false
};
const customStickerPress = {
  timer: null,
  pointerId: null,
  startX: 0,
  startY: 0
};
function loadNotes() {
  try {
    return JSON.parse(localStorage.getItem(noteStorageKey) || "{}");
  } catch {
    return {};
  }
}

function saveNotes() {
  localStorage.setItem(noteStorageKey, JSON.stringify(state.notes));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeCssUrl(value) {
  return String(value).replaceAll("'", "%27").replaceAll(")", "%29");
}

function uid(prefix = "photo") {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function dateKeyFromDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromKey(dateKey) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function todayDateKey() {
  return dateKeyFromDate(new Date());
}

function dayMonthText(date, includeYear = false) {
  const day = date.getDate();
  const month = new Intl.DateTimeFormat("en", { month: "long" }).format(date);
  return includeYear ? `${day} ${month} ${date.getFullYear()}` : `${day} ${month}`;
}

function relativeLabel(dateKey) {
  const todayKey = todayDateKey();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const date = dateFromKey(dateKey);
  const currentYear = new Date().getFullYear();
  const dateText = dayMonthText(date, date.getFullYear() !== currentYear);
  const weekday = new Intl.DateTimeFormat("en", { weekday: "long" }).format(date);

  if (dateKey === todayKey) {
    return { date: "Today", detail: dateText, relativeLabel: "Today", formattedDate: dateText, weekday };
  }

  if (dateKey === dateKeyFromDate(yesterday)) {
    return { date: "Yesterday", detail: dateText, relativeLabel: "Yesterday", formattedDate: dateText, weekday };
  }

  return {
    date: dateText,
    detail: weekday,
    relativeLabel: "",
    formattedDate: dateText,
    weekday
  };
}

function noteFor(day) {
  return Object.prototype.hasOwnProperty.call(state.notes, day.id)
    ? state.notes[day.id]
    : day.note || "";
}

function notePreviewFor(day) {
  return noteFor(day).replace(/\s+/g, " ").trim();
}

function selectedItem(type, id) {
  return state.selectedItemType === type && state.selectedPhotoId === id;
}

function clearSelection() {
  state.selectedPhotoId = "";
  state.selectedSurface = "";
  state.selectedItemType = "";
}

function selectItem(type, id) {
  state.selectedPhotoId = id;
  state.selectedSurface = "day";
  state.selectedItemType = type;
}

function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function elementsForDate(dateKey) {
  return state.canvasElements
    .filter((element) => element.dateKey === dateKey)
    .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
}

function getCanvasElement(elementId) {
  return state.canvasElements.find((element) => element.id === elementId);
}

function maxCanvasZIndex(dateKey) {
  const photoMax = state.userPhotos
    .filter((photo) => photo.dateKey === dateKey)
    .reduce((max, photo) => Math.max(max, photo.zIndex || 0), 0);
  const elementMax = elementsForDate(dateKey)
    .reduce((max, element) => Math.max(max, element.zIndex || 0), 0);
  return Math.max(photoMax, elementMax);
}

function undoStackForDate(dateKey) {
  if (!dateKey) return [];
  if (!state.undoHistory[dateKey]) state.undoHistory[dateKey] = [];
  return state.undoHistory[dateKey];
}

function snapshotForDate(dateKey) {
  return {
    dateKey,
    photos: deepClone(state.userPhotos.filter((photo) => photo.dateKey === dateKey)),
    elements: deepClone(state.canvasElements.filter((element) => element.dateKey === dateKey))
  };
}

function snapshotsEqual(snapshotA, snapshotB) {
  return JSON.stringify(snapshotA) === JSON.stringify(snapshotB);
}

function commitUndoSnapshot(beforeSnapshot) {
  if (!beforeSnapshot?.dateKey) return;

  const afterSnapshot = snapshotForDate(beforeSnapshot.dateKey);
  if (snapshotsEqual(beforeSnapshot, afterSnapshot)) return;

  const stack = undoStackForDate(beforeSnapshot.dateKey);
  stack.push(beforeSnapshot);
  if (stack.length > undoLimit) stack.splice(0, stack.length - undoLimit);
}

function currentUndoSnapshot() {
  const day = getDay();
  return day?.dateKey ? snapshotForDate(day.dateKey) : null;
}

function normalizedTextBackgroundStyle(style) {
  return textBackgroundOptions.some((option) => option.value === style) ? style : textDefaults.backgroundStyle;
}

function textBackgroundPadding(style) {
  const backgroundStyle = normalizedTextBackgroundStyle(style);
  if (backgroundStyle === "pill") return { x: 14, y: 7 };
  if (backgroundStyle === "white" || backgroundStyle === "glass") return { x: 10, y: 6 };
  return { x: 0, y: 0 };
}

function measureTextLayout(content, fontSize = textDefaults.fontSize, backgroundStyle = textDefaults.backgroundStyle) {
  const lines = String(content || "文字").split("\n");
  const longestLine = lines.reduce((longest, line) => Math.max(longest, Array.from(line || " ").length), 1);
  const padding = textBackgroundPadding(backgroundStyle);
  const width = Math.max(44, Math.ceil(longestLine * fontSize * 0.62)) + padding.x * 2;
  const height = Math.ceil(lines.length * fontSize * 1.18) + padding.y * 2;
  return { width, height };
}

function defaultTextElement(dateKey, content = "文字") {
  const fontSize = textDefaults.fontSize;
  const backgroundStyle = textDefaults.backgroundStyle;
  const size = measureTextLayout(content, fontSize, backgroundStyle);
  return {
    id: uid("text"),
    type: "text",
    content,
    dateKey,
    x: Math.round((canvasWidth - size.width) / 2),
    y: 248,
    width: size.width,
    height: size.height,
    rotation: 0,
    scale: 1,
    zIndex: maxCanvasZIndex(dateKey) + 1,
    fontSize,
    fontFamily: "-apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif",
    fontWeight: textDefaults.fontWeight,
    color: textDefaults.color,
    backgroundStyle,
    textAlign: "center",
    letterSpacing: "0"
  };
}

function positionTextElement(element, point) {
  if (!point) return element;

  const minX = -canvasWidth * 0.5;
  const maxX = canvasWidth * 1.2;
  const minY = -element.height * 0.8;
  const maxY = canvasHeight - element.height * 0.2;
  element.x = clamp(Math.round(point.x - element.width / 2), minX, maxX);
  element.y = clamp(Math.round(point.y - element.height / 2), minY, maxY);
  return element;
}

function positionPhotoElement(photo, point) {
  if (!point) return photo;

  photo.x = clamp(Math.round(point.x - photo.width / 2), 0, canvasWidth - photo.width);
  photo.y = clamp(Math.round(point.y - photo.height / 2), 0, canvasHeight - photo.height);
  return photo;
}

function defaultStickerElement(dateKey, sticker) {
  const isTextSticker = sticker.stickerType === "text";
  const isImageSticker = sticker.stickerType === "image";
  const imageSource = sticker.imageDataUrl || sticker.src || "";
  const imageMaxSize = 120;
  const aspectRatio = sticker.aspectRatio || 1;
  let imageWidth = 112;
  let imageHeight = imageWidth / aspectRatio;
  if (imageHeight > imageMaxSize) {
    imageHeight = imageMaxSize;
    imageWidth = imageHeight * aspectRatio;
  }
  const emojiSize = 76;

  return {
    id: uid("sticker"),
    type: "sticker",
    stickerType: sticker.stickerType,
    content: sticker.content,
    imageDataUrl: imageSource,
    src: imageSource,
    dateKey,
    x: isTextSticker ? 108 : isImageSticker ? 132 : 154,
    y: isTextSticker ? 188 : isImageSticker ? 168 : 176,
    width: isTextSticker ? 142 : isImageSticker ? imageWidth : emojiSize,
    height: isTextSticker ? 58 : isImageSticker ? imageHeight : emojiSize,
    rotation: 0,
    scale: 1,
    zIndex: maxCanvasZIndex(dateKey) + 1,
    fontSize: isTextSticker ? 22 : 56,
    color: sticker.color || "#222222",
    aspectRatio: sticker.aspectRatio || (isImageSticker ? imageWidth / imageHeight : 1)
  };
}

function defaultClipboardStickerElement(dateKey, image) {
  const aspectRatio = image.aspectRatio || 1;
  const maxWidth = Math.round(canvasWidth * 0.62);
  const maxHeight = Math.round(canvasHeight * 0.62);
  let width = Math.max(1, Math.round(Math.min(image.naturalWidth || maxWidth, maxWidth)));
  let height = Math.max(1, Math.round(width / aspectRatio));

  if (height > maxHeight) {
    height = maxHeight;
    width = Math.max(1, Math.round(height * aspectRatio));
  }

  return {
    id: uid("sticker"),
    type: "sticker",
    stickerType: "image",
    assetType: "clipboard",
    source: "clipboard",
    imageDataUrl: image.imageDataUrl,
    content: "",
    dateKey,
    x: Math.round((canvasWidth - width) / 2),
    y: Math.round((canvasHeight - height) / 2),
    width,
    height,
    rotation: 0,
    scale: 1,
    zIndex: maxCanvasZIndex(dateKey) + 1,
    fontSize: 48,
    color: "#222222",
    aspectRatio
  };
}

function positionCanvasElement(element, point) {
  if (!point) return element;

  element.x = clamp(Math.round(point.x - element.width / 2), 0, canvasWidth - element.width);
  element.y = clamp(Math.round(point.y - element.height / 2), 0, canvasHeight - element.height);
  return element;
}

function normalizeUserPhoto(photo) {
  return {
    ...photo,
    type: "user",
    src: photo.imageDataUrl,
    label: photo.label || "",
    caption: photo.label || "",
    aspectRatio: photo.aspectRatio || 1
  };
}

function generateLayout(photo, index) {
  const aspectRatio = photo.aspectRatio || 1;
  const widths = [186, 146, 164, 126, 154, 136, 172, 128];
  const positions = [
    [28, 24],
    [190, 104],
    [54, 214],
    [212, 284],
    [118, 384],
    [18, 396],
    [178, 28],
    [92, 122]
  ];
  const rotations = [-3, 4, -2, 3, -4, 2, 1, -1];
  const width = widths[index % widths.length];
  const height = width / aspectRatio;
  const [x, y] = positions[index % positions.length];

  return {
    x: clamp(x, 0, canvasWidth - width),
    y: clamp(y, 0, canvasHeight - height),
    width,
    height,
    rotation: rotations[index % rotations.length],
    scale: 1,
    zIndex: index + 1
  };
}

function sizeForStackPhoto(photo, baseWidth) {
  const aspectRatio = photo.aspectRatio || 1;
  const width = baseWidth;
  const height = width / aspectRatio;

  if (height <= 238) return { width, height };

  return {
    width: 238 * aspectRatio,
    height: 238
  };
}

function generateStackLayout(photo, index, count) {
  const single = () => {
    const baseWidth = photo.aspectRatio && photo.aspectRatio < 0.82 ? 214 : 270;
    const size = sizeForStackPhoto(photo, baseWidth);
    return {
      x: Math.round((stackPreviewWidth - size.width) / 2),
      y: Math.round((stackPreviewHeight - size.height) / 2) - 4,
      width: Math.round(size.width),
      height: Math.round(size.height),
      rotation: 0,
      zIndex: 1
    };
  };

  if (count <= 1) return single();

  const lightLayouts = [
    { x: 42, y: 72, width: 224, rotation: -5, zIndex: 2 },
    { x: 128, y: 120, width: 214, rotation: 6, zIndex: 3 },
    { x: 70, y: 190, width: 190, rotation: -8, zIndex: 4 }
  ];

  const pileLayouts = [
    { x: 24, y: 54, width: 176, rotation: -10, zIndex: 2 },
    { x: 144, y: 40, width: 164, rotation: 8, zIndex: 3 },
    { x: 76, y: 110, width: 204, rotation: 2, zIndex: 7 },
    { x: 198, y: 142, width: 142, rotation: 12, zIndex: 5 },
    { x: 34, y: 198, width: 166, rotation: -6, zIndex: 4 },
    { x: 124, y: 224, width: 178, rotation: 5, zIndex: 8 },
    { x: 8, y: 136, width: 136, rotation: -14, zIndex: 1 },
    { x: 230, y: 84, width: 120, rotation: 15, zIndex: 1 }
  ];

  const preset = count <= 3
    ? lightLayouts[index % lightLayouts.length]
    : pileLayouts[index % pileLayouts.length];
  const size = sizeForStackPhoto(photo, preset.width);

  return {
    x: clamp(preset.x, 0, stackPreviewWidth - size.width - 8),
    y: clamp(preset.y, 8, stackPreviewHeight - size.height - 14),
    width: Math.round(size.width),
    height: Math.round(size.height),
    rotation: preset.rotation,
    zIndex: preset.zIndex
  };
}

function stackPhotos() {
  return state.userPhotos
    .slice()
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    .slice(0, 8)
    .map(normalizeUserPhoto);
}

async function ensureLayoutsForPhotos() {
  let changed = false;
  const groups = new Map();

  state.userPhotos.forEach((photo) => {
    if (!groups.has(photo.dateKey)) groups.set(photo.dateKey, []);
    groups.get(photo.dateKey).push(photo);
  });

  groups.forEach((photos) => {
    photos
      .slice()
      .sort((a, b) => a.addedAt.localeCompare(b.addedAt))
      .forEach((photo, index) => {
        const needsLayout = [photo.x, photo.y, photo.width, photo.height, photo.rotation, photo.zIndex]
          .some((value) => typeof value !== "number");

        if (needsLayout) {
          Object.assign(photo, generateLayout(photo, index));
          changed = true;
        }

        if (typeof photo.scale !== "number") {
          photo.scale = 1;
          changed = true;
        }
      });
  });

  if (changed) await persistAllUserPhotos();
}

async function ensureLayoutsForCanvasElements() {
  let changed = false;

  state.canvasElements.forEach((element) => {
    if (typeof element.scale !== "number") {
      element.scale = 1;
      changed = true;
    }

    if (typeof element.rotation !== "number") {
      element.rotation = 0;
      changed = true;
    }

    if (typeof element.zIndex !== "number") {
      element.zIndex = 1;
      changed = true;
    }

    if (element.type === "text") {
      if (typeof element.fontSize !== "number") {
        element.fontSize = textDefaults.fontSize;
        changed = true;
      }
      if (!element.color) {
        element.color = textDefaults.color;
        changed = true;
      }
      if (!element.fontWeight) {
        element.fontWeight = textDefaults.fontWeight;
        changed = true;
      }
      if (!element.backgroundStyle) {
        element.backgroundStyle = textDefaults.backgroundStyle;
        changed = true;
      }

      element.backgroundStyle = normalizedTextBackgroundStyle(element.backgroundStyle);
      const size = measureTextLayout(element.content, element.fontSize, element.backgroundStyle);
      if (typeof element.width !== "number" || element.width !== size.width) {
        element.width = size.width;
        changed = true;
      }
      if (typeof element.height !== "number" || element.height !== size.height) {
        element.height = size.height;
        changed = true;
      }
    }
  });

  if (changed) await Promise.all(state.canvasElements.map((element) => saveCanvasElement(element)));
}

function buildUserDayModels() {
  const groups = new Map();

  state.userPhotos
    .slice()
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    .forEach((photo) => {
      if (!groups.has(photo.dateKey)) groups.set(photo.dateKey, []);
      groups.get(photo.dateKey).push(normalizeUserPhoto(photo));
    });

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, photos]) => ({
      id: `user-${dateKey}`,
      dateKey,
      isUserDay: true,
      note: "",
      photos,
      ...relativeLabel(dateKey)
    }));
}

function getDay(dayId = state.activeDayId) {
  const userDays = buildUserDayModels();
  return userDays.find((day) => day.id === dayId) || userDays[0] || null;
}

function polaroid(photo, options = {}) {
  const tilt = options.tilt || "0deg";
  const size = options.size || "";
  const layer = options.layer || "";
  const caption = photo.label || photo.caption || "";

  return `
    <figure class="polaroid ${size} ${layer}" style="--tilt:${escapeHtml(tilt)}; --photo-url:url('${escapeCssUrl(photo.src)}');">
      <div class="photo-image" aria-hidden="true"></div>
      <figcaption>${caption ? escapeHtml(caption) : "&nbsp;"}</figcaption>
    </figure>
  `;
}

function dateTitle(day, options = {}) {
  if (options.includeWeekday) {
    const hasRelativeLabel = Boolean(day.relativeLabel);
    const primary = hasRelativeLabel ? day.relativeLabel : day.formattedDate || day.date;
    const secondary = hasRelativeLabel ? day.formattedDate || day.detail : day.weekday || day.detail;
    const weekday = hasRelativeLabel ? day.weekday : "";

    return `
      <h2 class="date-heading">
        <span>${escapeHtml(primary)}</span>
        <i></i>
        <em>${escapeHtml(secondary)}</em>
        ${weekday ? `<i></i><em>${escapeHtml(weekday)}</em>` : ""}
      </h2>
    `;
  }

  return `
    <h2 class="date-heading">
      <span>${escapeHtml(day.date)}</span>
      <i></i>
      <em>${escapeHtml(day.detail)}</em>
    </h2>
  `;
}

function memoryStackPhoto(photo, index, count) {
  const layout = generateStackLayout(photo, index, count);
  const style = [
    `left:${layout.x}px`,
    `top:${layout.y}px`,
    `width:${layout.width}px`,
    `height:${layout.height}px`,
    `z-index:${layout.zIndex}`,
    `--rotation:${layout.rotation}deg`
  ].join(";");

  return `
    <figure class="memory-stack-photo" style="${style}">
      <img src="${photo.src}" alt="" draggable="false" />
    </figure>
  `;
}

function settingsIcon() {
  return `
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M4.8 7.2h14.4" />
      <path d="M4.8 12h14.4" />
      <path d="M4.8 16.8h14.4" />
    </svg>
  `;
}

function exportIcon() {
  return `
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M12 15.5V4.8" />
      <path d="M7.7 8.9 12 4.6l4.3 4.3" />
      <path d="M5.7 13.8v4.1c0 1 .7 1.7 1.7 1.7h9.2c1 0 1.7-.7 1.7-1.7v-4.1" />
    </svg>
  `;
}

function undoIcon() {
  return `
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M9.3 7.2 5.5 11l3.8 3.8" />
      <path d="M5.8 11h8.1c3.1 0 5.1 1.8 5.1 4.4 0 1.2-.4 2.3-1.2 3.1" />
    </svg>
  `;
}

function noteIcon() {
  return `
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M7 4.8h7.4l3.6 3.6v10.8H7V4.8Z" />
      <path d="M14.2 4.9v3.7h3.7" />
      <path d="M9.7 12h5.1" />
      <path d="M9.7 15.2h4.2" />
    </svg>
  `;
}

function clipboardPasteIcon() {
  return `
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M9.1 5.2h5.8" />
      <path d="M9.6 4.2h4.8c.6 0 1 .4 1 1v1.2c0 .6-.4 1-1 1H9.6c-.6 0-1-.4-1-1V5.2c0-.6.4-1 1-1Z" />
      <path d="M8.2 6.2H7c-.8 0-1.4.6-1.4 1.4v10.7c0 .8.6 1.4 1.4 1.4h10c.8 0 1.4-.6 1.4-1.4V7.6c0-.8-.6-1.4-1.4-1.4h-1.2" />
      <path d="M12 10.4v5.1" />
      <path d="m9.8 13.4 2.2 2.2 2.2-2.2" />
    </svg>
  `;
}

function settingsButton() {
  return `
    <button class="settings-button" type="button" data-action="open-settings" aria-label="菜单" title="菜单">
      ${settingsIcon()}
    </button>
  `;
}

function settingsSheet() {
  if (!state.settingsSheetOpen) return "";

  return `
    <button class="settings-backdrop" type="button" data-action="close-settings" aria-label="关闭设置"></button>
    <section class="settings-sheet" aria-label="设置">
      <div class="settings-sheet-handle" aria-hidden="true"></div>
      <button class="settings-option" type="button" data-action="export-backup" ${state.isExportingBackup ? "disabled" : ""}>${state.isExportingBackup ? "正在导出…" : "导出备份"}</button>
      <button class="settings-option" type="button" data-action="restore-backup">恢复备份</button>
      <button class="settings-close-button" type="button" data-action="close-settings" aria-label="关闭设置">取消</button>
    </section>
  `;
}

function toastMarkup() {
  if (!state.toast) return "";
  return `<div class="toast-message" role="status">${escapeHtml(state.toast)}</div>`;
}

function showToast(message) {
  state.toast = message;
  if (state.toastTimer) window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => {
    state.toast = "";
    state.toastTimer = null;
    render();
  }, 2200);
  render();
}

function renderEmptyHome() {
  return `
    <main class="memory-home memory-home-empty" aria-label="回忆照片堆">
      <h1 class="sr-only">回忆照片堆</h1>
      ${settingsButton()}

      <button class="memory-empty-state" type="button" data-action="add-first-photo" aria-label="添加第一张照片" title="添加第一张照片">
        <p>添加第一张回忆照片。</p>
      </button>
      ${settingsSheet()}
      ${toastMarkup()}
    </main>
  `;
}

function renderHome() {
  const photos = stackPhotos();
  if (!photos.length) return renderEmptyHome();

  return `
    <main class="memory-home" aria-label="回忆照片堆">
      <h1 class="sr-only">回忆照片堆</h1>
      ${settingsButton()}

      <button class="memory-stack-area" type="button" data-action="open-daybook" aria-label="打开 Daybook">
        <span class="memory-stack-stage">
          ${photos.map((photo, index) => memoryStackPhoto(photo, index, photos.length)).join("")}
        </span>
      </button>

      <button class="memory-caption" type="button" data-action="open-daybook">最近发生了很多事。</button>
      ${settingsSheet()}
      ${toastMarkup()}
    </main>
  `;
}

function renderEmptyDaybook() {
  return `
    <main class="phone-screen daybook-view" aria-label="Daybook">
      <header class="daybook-header">
        <button class="icon-text-button daybook-pile-button" type="button" data-action="home">Pile</button>
        <h1>Daybook</h1>
        <button class="round-button daybook-add-button" type="button" data-action="add-photo" aria-label="添加照片" title="添加照片">+</button>
      </header>

      <section class="empty-daybook">
        <p>添加照片，开始记录你的 Daybook。</p>
        <button class="home-add-button" type="button" data-action="add-photo" aria-label="添加照片" title="添加照片">+</button>
      </section>
    </main>
  `;
}

function renderDaybook() {
  const days = buildUserDayModels();
  if (!days.length) return renderEmptyDaybook();

  return `
    <main class="phone-screen daybook-view" aria-label="Daybook">
      <header class="daybook-header">
        <button class="icon-text-button daybook-pile-button" type="button" data-action="home">Pile</button>
        <h1>Daybook</h1>
        <button class="round-button daybook-add-button" type="button" data-action="add-photo" aria-label="添加照片" title="添加照片">+</button>
      </header>

      <div class="day-feed">
        ${days.map((day) => `
          <button class="day-section" type="button" data-day="${day.id}" aria-label="打开 ${day.date}">
            ${dateTitle(day, { includeWeekday: true })}
            <div class="photo-strip">
              ${day.photos.slice(0, 4).map((photo, index) =>
                polaroid(photo, {
                  tilt: ["-3deg", "1deg", "-1deg", "3deg"][index] || "1deg",
                  size: "strip-photo"
                })
              ).join("")}
            </div>
            ${notePreviewFor(day)
              ? `<p class="day-note-preview">${escapeHtml(notePreviewFor(day))}</p>`
              : ""}
          </button>
        `).join("")}
      </div>
    </main>
  `;
}

function freeCanvasPhoto(photo) {
  const selected = selectedItem("photo", photo.id) ? "is-selected" : "";
  const style = [
    `left:${photo.x}px`,
    `top:${photo.y}px`,
    `width:${photo.width}px`,
    `height:${photo.height}px`,
    `z-index:${photo.zIndex}`,
    `--rotation:${photo.rotation}deg`,
    `--scale:${photo.scale || 1}`
  ].join(";");

  return `
    <div class="canvas-item free-photo ${selected}" data-item-type="photo" data-item-id="${photo.id}" data-surface="day" data-photo-id="${photo.id}" style="${style}">
      <img src="${photo.src}" alt="" draggable="false" />
      <button class="delete-photo" type="button" data-action="delete-photo" aria-label="删除照片" title="删除照片">×</button>
      <span class="rotate-handle" aria-hidden="true">↻</span>
      <span class="resize-handle" aria-hidden="true"></span>
    </div>
  `;
}

function canvasElement(element) {
  const selected = selectedItem(element.type, element.id) ? "is-selected" : "";
  const baseStyle = [
    `left:${element.x}px`,
    `top:${element.y}px`,
    `z-index:${element.zIndex}`,
    `--rotation:${element.rotation}deg`,
    `--scale:${element.scale || 1}`
  ];

  if (element.type !== "text") {
    baseStyle.push(
      `width:${element.width}px`,
      `height:${element.height}px`
    );
  }

  if (element.type === "text") {
    const backgroundStyle = normalizedTextBackgroundStyle(element.backgroundStyle);
    baseStyle.push(
      `--font-size:${element.fontSize}px`,
      `--font-family:${escapeHtml(element.fontFamily)}`,
      `--font-weight:${escapeHtml(element.fontWeight)}`,
      `--font-color:${escapeHtml(element.color)}`,
      `--text-align:${escapeHtml(element.textAlign)}`,
      `--letter-spacing:${escapeHtml(element.letterSpacing || "0")}`
    );

    return `
      <div class="canvas-item canvas-text-element ${selected}" data-item-type="text" data-item-id="${element.id}" data-background-style="${backgroundStyle}" style="${baseStyle.join(";")}">${escapeHtml(element.content)}</div>
    `;
  }

  const stickerType = element.type === "emoji" ? "emoji" : element.stickerType;
  const stickerClass = [
    stickerType === "text" ? "text-sticker" : stickerType === "image" ? "image-sticker" : "emoji-sticker",
    element.assetType === "clipboard" ? "clipboard-sticker" : ""
  ].filter(Boolean).join(" ");
  baseStyle.push(
    `--font-size:${element.fontSize}px`,
    `--sticker-color:${escapeHtml(element.color || "#222222")}`
  );

  return `
    <div class="canvas-item canvas-sticker ${stickerClass} ${selected}" data-item-type="${element.type}" data-item-id="${element.id}" style="${baseStyle.join(";")}">
      ${stickerType === "image"
        ? `<img src="${escapeHtml(element.imageDataUrl || element.src || "")}" alt="" draggable="false" />`
        : `<span>${escapeHtml(element.content)}</span>`}
      <button class="delete-photo" type="button" data-action="delete-element" aria-label="删除贴纸" title="删除贴纸">×</button>
      <span class="rotate-handle" aria-hidden="true">↻</span>
      <span class="resize-handle" aria-hidden="true"></span>
    </div>
  `;
}

function stickerSheet() {
  if (state.activePanel !== "sticker") return "";
  const sheetState = ["preview", "collapsed", "expanded"].includes(state.stickerSheetState)
    ? state.stickerSheetState
    : "collapsed";
  const systemStickers = ["❤️", "✨", "🌷", "🎀", "☁️", "🌙", "☕", "📷", "🎂", "🧸", "⭐", "📍"];
  const stickerItems = [
    ...state.customStickers.map((sticker) => ({ type: "custom", sticker })),
    ...systemStickers.map((content) => ({ type: "emoji", content }))
  ];
  const stickerRows = [
    stickerItems.slice(0, 5),
    stickerItems.slice(5)
  ];
  const stickerButton = (content, classes = "") => `
    <button
      class="sticker-token-button ${classes}"
      type="button"
      data-action="add-sticker"
      data-sticker-type="emoji"
      data-sticker-content="${escapeHtml(content)}"
      data-sticker-color="#222222"
      aria-label="添加 ${escapeHtml(content)} 贴纸"
    >${escapeHtml(content)}</button>
  `;
  const customStickerButton = (sticker) => `
    <button
      class="sticker-token-button custom-sticker-token"
      type="button"
      data-action="add-sticker"
      data-sticker-type="image"
      data-sticker-id="${escapeHtml(sticker.id)}"
      aria-label="添加自定义贴纸"
    >
      <img src="${escapeHtml(sticker.imageDataUrl || sticker.src || "")}" alt="" draggable="false" />
    </button>
  `;
  const stickerItemButton = (item) => item.type === "custom"
    ? customStickerButton(item.sticker)
    : stickerButton(item.content);

  return `
    <button class="sticker-backdrop" type="button" data-action="close-panel" aria-label="关闭贴纸"></button>
    <section class="sticker-sheet ${sheetState}" aria-label="贴纸库" data-sticker-sheet>
      <header class="sticker-sheet-header">
        <button class="sheet-grabber" type="button" data-action="toggle-sticker-sheet" data-sticker-sheet-handle aria-label="展开或收起贴纸"></button>
      </header>
      <div class="sticker-sheet-content">
        <label class="sticker-search">
          <span class="sr-only">搜索贴纸</span>
          <input type="search" placeholder="搜索" autocomplete="off" />
        </label>

        <div class="system-sticker-grid" aria-label="贴纸">
          <div class="sticker-token-row">
            <button class="sticker-token-button sticker-add-button" type="button" data-action="open-sticker-image-picker" aria-label="添加贴纸" title="添加贴纸">
              <span aria-hidden="true">+</span>
            </button>
            ${stickerRows[0].map(stickerItemButton).join("")}
          </div>
          <div class="sticker-token-row sticker-token-row-offset">
            ${stickerRows[1].map(stickerItemButton).join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

function stickerImagePicker() {
  if (!state.stickerImagePickerOpen) return "";
  const savedStickerThumbs = state.customStickers.slice(0, 12).map((sticker) => `
    <div class="sticker-image-picker-item ${state.customStickerManageMode ? "is-managing" : ""}" data-custom-sticker-id="${escapeHtml(sticker.id)}">
      <button
        class="sticker-image-picker-thumb"
        type="button"
        data-action="add-sticker"
        data-sticker-type="image"
        data-sticker-id="${escapeHtml(sticker.id)}"
        data-custom-sticker-thumb
        aria-label="使用这个贴纸"
      >
        <img src="${escapeHtml(sticker.imageDataUrl || sticker.src || "")}" alt="" draggable="false" />
      </button>
      <button class="sticker-image-picker-delete" type="button" data-action="delete-custom-sticker" data-sticker-id="${escapeHtml(sticker.id)}" aria-label="删除这个贴纸">×</button>
    </div>
  `).join("");

  return `
    <section class="sticker-image-picker" aria-label="添加贴纸">
      <header class="sticker-image-picker-header">
        <button class="sticker-image-picker-close" type="button" data-action="close-sticker-image-picker">关闭</button>
        <h1>添加贴纸</h1>
        <button class="sticker-image-picker-manage" type="button" data-action="toggle-custom-sticker-management" aria-label="${state.customStickerManageMode ? "完成整理" : "整理贴纸"}">${state.customStickerManageMode ? "完成" : "整理"}</button>
      </header>
      <div class="sticker-image-picker-content">
        <button class="sticker-image-picker-select" type="button" data-action="choose-sticker-image">
          <span aria-hidden="true">+</span>
          <strong>选择图片作为贴纸</strong>
          <small>选择图片后会作为贴纸加入当前页面</small>
        </button>
        ${savedStickerThumbs ? `
          <div class="sticker-image-picker-grid" aria-label="已添加贴纸">
            ${savedStickerThumbs}
          </div>
        ` : ""}
      </div>
    </section>
  `;
}

function textEditorPanel() {
  const element = selectedTextElement();
  if (!element || state.activePanel !== "text") return "";

  const value = state.textComposer.editingId === element.id ? state.textComposer.value : element.content;
  const fontSize = Number(state.textComposer.editingId === element.id ? state.textComposer.fontSize : element.fontSize) || textDefaults.fontSize;
  const color = state.textComposer.editingId === element.id ? state.textComposer.color : element.color || textDefaults.color;
  const backgroundStyle = normalizedTextBackgroundStyle(
    state.textComposer.editingId === element.id ? state.textComposer.backgroundStyle : element.backgroundStyle
  );

  return `
    <section class="text-editor-panel" aria-label="文字编辑面板">
      <div class="text-editor-header">
        <span>文字</span>
        <button class="text-composer-done" type="button" data-action="complete-text-compose">完成</button>
      </div>
      <textarea
        id="textComposerInput"
        class="text-editor-input"
        data-text-composer
        placeholder="写点什么……"
        rows="2"
      >${escapeHtml(value)}</textarea>
      <div class="text-editor-controls">
        <div class="text-editor-row">
          <span>字号</span>
          <div class="text-segmented-control">
            ${textSizeOptions.map((option) => `
              <button class="${fontSize === option.value ? "is-active" : ""}" type="button" data-action="text-font-size" data-font-size="${option.value}">${option.label}</button>
            `).join("")}
          </div>
        </div>
        <div class="text-editor-row">
          <span>颜色</span>
          <div class="text-color-control">
            ${textColorOptions.map((option) => `
              <button
                class="${color === option.value ? "is-active" : ""}"
                type="button"
                data-action="text-color"
                data-color="${option.value}"
                aria-label="${option.label}"
                title="${option.label}"
              >
                <i style="--swatch-color:${option.value}"></i>
              </button>
            `).join("")}
          </div>
        </div>
        <div class="text-editor-row">
          <span>背景</span>
          <div class="text-background-control">
            ${textBackgroundOptions.map((option) => `
              <button class="${backgroundStyle === option.value ? "is-active" : ""}" type="button" data-action="text-background" data-background-style="${option.value}">${option.label}</button>
            `).join("")}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderSingleDay() {
  const day = getDay();
  if (!day) return renderEmptyDaybook();

  const note = noteFor(day);
  const safeNote = escapeHtml(note);
  const noteDialogTitle = note.trim() ? "编辑记录" : "添加记录";
  const dayElements = elementsForDate(day.dateKey);
  const canUndo = undoStackForDate(day.dateKey).length > 0;

  return `
    <main class="phone-screen single-day-view" aria-label="单日编辑页面">
      <header class="day-page-header">
        <div class="header-side header-left">
          <button class="header-action back-button" type="button" data-action="daybook">返回</button>
        </div>
        <div class="header-center" aria-hidden="true"></div>
        <div class="header-side header-right">
          <button class="header-icon-action undo-button" type="button" data-action="undo" aria-label="撤销" title="撤销" ${canUndo ? "" : "disabled"}>
            ${undoIcon()}
          </button>
          <button class="header-icon-action export-day-button" type="button" data-action="export-day" aria-label="导出当天图片" title="导出当天图片" ${state.isExportingDay ? "disabled" : ""}>
            ${exportIcon()}
          </button>
        </div>
      </header>

      <header class="single-header">
        ${dateTitle(day)}
        ${note ? `<p class="single-note">${safeNote}</p>` : ""}
      </header>

      <section class="free-canvas" aria-label="自由排版画布">
        ${day.photos.map(freeCanvasPhoto).join("")}
        ${dayElements.map(canvasElement).join("")}
        <div class="floating-toolbox" aria-label="画布工具">
          <button type="button" data-action="add-text" aria-label="添加文字" title="添加文字"><span class="toolbox-text-mark" aria-hidden="true">Aa</span></button>
          <button type="button" data-action="open-sticker-panel" aria-label="添加贴纸" title="添加贴纸">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M7.2 5.5h8.2c1.7 0 3.1 1.4 3.1 3.1v5.1c0 2.7-2.1 4.8-4.8 4.8H7.2v-13Z" />
              <path d="M13.7 18.5c0-2.7 2.1-4.8 4.8-4.8" />
              <path d="M9.9 10.1h.1" />
              <path d="M14.1 10.1h.1" />
              <path d="M10.2 13.4c.7.8 2.9.8 3.6 0" />
            </svg>
          </button>
          <button type="button" data-action="edit-note" aria-label="当天记录" title="当天记录">${noteIcon()}</button>
        </div>
        <div class="canvas-action-bar" aria-label="画布添加操作">
          <button class="clipboard-paste-button" type="button" data-action="paste-clipboard" aria-label="粘贴抠图或文字" title="粘贴抠图或文字" ${state.isReadingClipboard ? "disabled" : ""}>
            ${clipboardPasteIcon()}
          </button>
          <button class="canvas-add-button" type="button" data-action="add-photo" aria-label="添加照片" title="添加照片">+</button>
        </div>
      </section>
      <div class="delete-zone" aria-hidden="true">
        <div class="delete-zone-inner">
          <span class="delete-zone-copy delete-label" data-idle-copy="拖到这里删除" data-active-copy="松手删除">拖到这里删除</span>
          <span class="delete-icon-circle" aria-hidden="true">
            <svg viewBox="0 0 24 24" focusable="false">
              <path d="M8.5 7.5V5.8c0-.7.5-1.2 1.2-1.2h4.6c.7 0 1.2.5 1.2 1.2v1.7" />
              <path d="M6.4 7.5h11.2" />
              <path d="M8 9.7l.5 9.1c0 .8.6 1.3 1.4 1.3h4.2c.8 0 1.4-.5 1.4-1.3l.5-9.1" />
              <path d="M10.4 11.4v5.8" />
              <path d="M13.6 11.4v5.8" />
            </svg>
          </span>
        </div>
      </div>
      ${stickerSheet()}
      ${stickerImagePicker()}
      ${textEditorPanel()}
      ${toastMarkup()}
    </main>

    <dialog class="note-dialog" id="noteDialog" aria-labelledby="noteDialogTitle">
      <form method="dialog">
        <h2 id="noteDialogTitle">${noteDialogTitle}</h2>
        <p class="note-dialog-description">将显示在当天照片下方。</p>
        <label class="sr-only" for="noteInput">记录</label>
        <textarea id="noteInput">${safeNote}</textarea>
        <div class="dialog-actions">
          <button class="ghost-button" value="cancel" type="submit">取消</button>
          <button class="add-button" value="save" type="submit">保存</button>
        </div>
      </form>
    </dialog>
  `;
}

function renderView(view) {
  return {
    home: renderHome,
    daybook: renderDaybook,
    single: renderSingleDay
  }[view]();
}

function resetHorizontalScroll() {
  document.documentElement.scrollLeft = 0;
  document.body.scrollLeft = 0;
  document.querySelector("#app")?.scrollTo?.({ left: 0 });
}

function render() {
  const app = document.querySelector("#app");
  app.innerHTML = renderView(state.view);
  document.body.classList.toggle("settings-open", state.settingsSheetOpen);
  resetHorizontalScroll();
  scheduleCanvasSafetyRepair();
}

function canvasPointFromClient(clientX, clientY) {
  const canvas = document.querySelector(".free-canvas");
  const rect = canvas?.getBoundingClientRect();
  if (!rect?.width || !rect?.height) {
    return { x: Math.round(canvasWidth / 2), y: Math.round(canvasHeight / 2) };
  }

  return {
    x: clamp(Math.round((clientX - rect.left) * (canvasWidth / rect.width)), 0, canvasWidth),
    y: clamp(Math.round((clientY - rect.top) * (canvasHeight / rect.height)), 0, canvasHeight)
  };
}

function visibleCanvasCenterPoint() {
  const canvas = document.querySelector(".free-canvas");
  const rect = canvas?.getBoundingClientRect();
  if (!rect?.width || !rect?.height) {
    return { x: Math.round(canvasWidth / 2), y: Math.round(canvasHeight / 2) };
  }

  const clientX = clamp(window.innerWidth / 2, rect.left, rect.right);
  const clientY = clamp(window.innerHeight / 2, rect.top, rect.bottom);
  return canvasPointFromClient(clientX, clientY);
}

function preparePageState(targetView, options = {}) {
  clearSelection();
  activePointers.clear();
  setDeleteZoneVisible(false);
  state.activePanel = "";
  state.settingsSheetOpen = false;
  state.pendingInsertPoint = null;
  state.pendingPhotoSource = "";
  state.textComposer = { active: false, editingId: "", value: "" };

  if (targetView === "single" && options.dayId) {
    state.activeDayId = options.dayId;
  }

  if (targetView !== "single" && options.clearDay !== false) {
    state.activeDayId = "";
  }

  state.view = targetView;
}

function navigateToPage(targetView, direction = "forward", options = {}) {
  const app = document.querySelector("#app");
  if (!app || isPageTransitioning) return;

  if (state.view === targetView && (!options.dayId || options.dayId === state.activeDayId)) {
    return;
  }

  const fromView = state.view;
  const outgoingHtml = app.innerHTML || renderView(fromView);
  preparePageState(targetView, options);
  const incomingHtml = renderView(targetView);
  const transitionClass = direction === "back" ? "transition-back" : "transition-forward";

  isPageTransitioning = true;
  app.innerHTML = `
    <div class="app-stage ${transitionClass}" aria-live="polite">
      <section class="page-layer outgoing-page" aria-hidden="true">${outgoingHtml}</section>
      <section class="page-layer incoming-page">${incomingHtml}</section>
    </div>
  `;

  const stage = app.querySelector(".app-stage");
  const finish = () => {
    if (!isPageTransitioning) return;
    isPageTransitioning = false;
    render();
  };

  requestAnimationFrame(() => {
    requestAnimationFrame(() => stage?.classList.add("is-animating"));
  });

  const incoming = app.querySelector(".incoming-page");
  const onIncomingTransitionEnd = (event) => {
    if (event.target !== incoming) return;
    incoming?.removeEventListener("transitionend", onIncomingTransitionEnd);
    finish();
  };
  incoming?.addEventListener("transitionend", onIncomingTransitionEnd);
  window.setTimeout(finish, pageTransitionMs + 80);
}

function openDay(dayId) {
  navigateToPage("single", "forward", { dayId, clearDay: false });
}

function clearDayPress() {
  dayPress.element?.classList.remove("is-pressing");
  dayPress.element = null;
  dayPress.dayId = "";
  dayPress.pointerId = null;
}

function startDayPress(event) {
  const section = event.target.closest(".day-section[data-day]");
  if (!section || state.view !== "daybook") return false;

  event.preventDefault();
  clearDayPress();
  dayPress.element = section;
  dayPress.dayId = section.dataset.day;
  dayPress.pointerId = event.pointerId;
  section.setPointerCapture?.(event.pointerId);
  section.classList.add("is-pressing");
  return true;
}

function endDayPress(event) {
  if (!dayPress.element || event.pointerId !== dayPress.pointerId) return;

  const section = dayPress.element;
  const dayId = dayPress.dayId;
  const rect = section.getBoundingClientRect();
  const isInside = event.clientX >= rect.left
    && event.clientX <= rect.right
    && event.clientY >= rect.top
    && event.clientY <= rect.bottom;

  clearDayPress();
  if (!isInside) return;

  window.setTimeout(() => openDay(dayId), 100);
}

function moveDayPress(event) {
  if (!dayPress.element || event.pointerId !== dayPress.pointerId) return;

  const rect = dayPress.element.getBoundingClientRect();
  const isInside = event.clientX >= rect.left
    && event.clientX <= rect.right
    && event.clientY >= rect.top
    && event.clientY <= rect.bottom;

  if (!isInside) clearDayPress();
}

function cancelDayPress(event) {
  if (!dayPress.element || (event.pointerId && event.pointerId !== dayPress.pointerId)) return;
  clearDayPress();
}

function daybookNavButtonTarget(event) {
  return event.target.closest(".daybook-pile-button, .daybook-add-button");
}

function stopDaybookNavPointerEvent(event) {
  if (!daybookNavButtonTarget(event)) return false;
  event.stopPropagation();
  clearDayPress();
  return true;
}

function editNote() {
  const dialog = document.querySelector("#noteDialog");
  const input = document.querySelector("#noteInput");
  const day = getDay();
  if (!dialog || !input || !day) return;

  input.value = noteFor(day);
  dialog.showModal();
  input.focus();

  dialog.addEventListener("close", () => {
    if (dialog.returnValue !== "save") return;
    state.notes[day.id] = input.value.trim() ? input.value : "";
    saveNotes();
    render();
  }, { once: true });
}

function openPhotoPicker(point = null, options = {}) {
  const day = getDay();
  state.pendingImportDateKey = state.view === "single" && day?.dateKey ? day.dateKey : todayDateKey();
  state.pendingInsertPoint = point;
  state.pendingPhotoSource = options.source || "";
  const input = document.querySelector("#photoInput");
  input.value = "";
  input.click();
}

function openPhotoDatabase() {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }

    const request = indexedDB.open(dbName, 4);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(photoStoreName)) {
        const store = db.createObjectStore(photoStoreName, { keyPath: "id" });
        store.createIndex("dateKey", "dateKey", { unique: false });
        store.createIndex("addedAt", "addedAt", { unique: false });
      }
      if (!db.objectStoreNames.contains(elementStoreName)) {
        const store = db.createObjectStore(elementStoreName, { keyPath: "id" });
        store.createIndex("dateKey", "dateKey", { unique: false });
        store.createIndex("type", "type", { unique: false });
      }
      if (!db.objectStoreNames.contains(customStickerStoreName)) {
        const store = db.createObjectStore(customStickerStoreName, { keyPath: "id" });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function loadUserPhotos() {
  if (state.storageMode === "localStorage") {
    return JSON.parse(localStorage.getItem(localPhotosKey) || "[]");
  }

  const transaction = state.db.transaction(photoStoreName, "readonly");
  const request = transaction.objectStore(photoStoreName).getAll();
  const records = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  return records.sort((a, b) => b.addedAt.localeCompare(a.addedAt));
}

async function loadCanvasElements() {
  if (state.storageMode === "localStorage") {
    try {
      return JSON.parse(localStorage.getItem(localElementsKey) || "[]");
    } catch {
      return [];
    }
  }

  const transaction = state.db.transaction(elementStoreName, "readonly");
  const request = transaction.objectStore(elementStoreName).getAll();
  const records = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  return records;
}

async function loadCustomStickers() {
  if (state.storageMode === "localStorage") {
    try {
      return JSON.parse(localStorage.getItem(localCustomStickersKey) || "[]");
    } catch {
      return [];
    }
  }

  const transaction = state.db.transaction(customStickerStoreName, "readonly");
  const request = transaction.objectStore(customStickerStoreName).getAll();
  const records = await new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
  return records.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
}

async function persistAllUserPhotos() {
  if (state.storageMode === "localStorage") {
    localStorage.setItem(localPhotosKey, JSON.stringify(state.userPhotos));
    return;
  }

  const transaction = state.db.transaction(photoStoreName, "readwrite");
  const store = transaction.objectStore(photoStoreName);
  state.userPhotos.forEach((record) => store.put(record));
  await transactionDone(transaction);
}

async function persistAllCanvasElements() {
  if (state.storageMode === "localStorage") {
    localStorage.setItem(localElementsKey, JSON.stringify(state.canvasElements));
    return;
  }

  const transaction = state.db.transaction(elementStoreName, "readwrite");
  const store = transaction.objectStore(elementStoreName);
  state.canvasElements.forEach((record) => store.put(record));
  await transactionDone(transaction);
}

async function saveUserPhotos(records) {
  state.userPhotos = [...records, ...state.userPhotos].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  await persistAllUserPhotos();
}

async function saveCanvasElement(element) {
  const currentIndex = state.canvasElements.findIndex((item) => item.id === element.id);
  if (currentIndex >= 0) {
    state.canvasElements[currentIndex] = element;
  } else {
    state.canvasElements.push(element);
  }

  if (state.storageMode === "localStorage") {
    localStorage.setItem(localElementsKey, JSON.stringify(state.canvasElements));
    return;
  }

  const transaction = state.db.transaction(elementStoreName, "readwrite");
  transaction.objectStore(elementStoreName).put(element);
  await transactionDone(transaction);
}

async function saveCustomSticker(sticker) {
  state.customStickers = [sticker, ...state.customStickers.filter((item) => item.id !== sticker.id)];

  if (state.storageMode === "localStorage") {
    localStorage.setItem(localCustomStickersKey, JSON.stringify(state.customStickers));
    return;
  }

  const transaction = state.db.transaction(customStickerStoreName, "readwrite");
  transaction.objectStore(customStickerStoreName).put(sticker);
  await transactionDone(transaction);
}

async function deleteCustomSticker(stickerId) {
  state.customStickers = state.customStickers.filter((sticker) => sticker.id !== stickerId);

  if (state.storageMode === "localStorage") {
    localStorage.setItem(localCustomStickersKey, JSON.stringify(state.customStickers));
    return;
  }

  const transaction = state.db.transaction(customStickerStoreName, "readwrite");
  transaction.objectStore(customStickerStoreName).delete(stickerId);
  await transactionDone(transaction);
}

async function updateUserPhoto(photo) {
  if (state.storageMode === "localStorage") {
    localStorage.setItem(localPhotosKey, JSON.stringify(state.userPhotos));
    return;
  }

  const transaction = state.db.transaction(photoStoreName, "readwrite");
  transaction.objectStore(photoStoreName).put(photo);
  await transactionDone(transaction);
}

async function deleteUserPhoto(photoId) {
  state.userPhotos = state.userPhotos.filter((photo) => photo.id !== photoId);

  if (state.storageMode === "localStorage") {
    localStorage.setItem(localPhotosKey, JSON.stringify(state.userPhotos));
    return;
  }

  const transaction = state.db.transaction(photoStoreName, "readwrite");
  transaction.objectStore(photoStoreName).delete(photoId);
  await transactionDone(transaction);
}

async function deleteCanvasElement(elementId) {
  state.canvasElements = state.canvasElements.filter((element) => element.id !== elementId);

  if (state.storageMode === "localStorage") {
    localStorage.setItem(localElementsKey, JSON.stringify(state.canvasElements));
    return;
  }

  const transaction = state.db.transaction(elementStoreName, "readwrite");
  transaction.objectStore(elementStoreName).delete(elementId);
  await transactionDone(transaction);
}

async function restoreDaySnapshot(snapshot) {
  if (!snapshot?.dateKey) return;

  state.userPhotos = [
    ...state.userPhotos.filter((photo) => photo.dateKey !== snapshot.dateKey),
    ...deepClone(snapshot.photos)
  ].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  state.canvasElements = [
    ...state.canvasElements.filter((element) => element.dateKey !== snapshot.dateKey),
    ...deepClone(snapshot.elements)
  ];

  if (state.storageMode === "localStorage") {
    localStorage.setItem(localPhotosKey, JSON.stringify(state.userPhotos));
    localStorage.setItem(localElementsKey, JSON.stringify(state.canvasElements));
    return;
  }

  const transaction = state.db.transaction([photoStoreName, elementStoreName], "readwrite");
  const photoStore = transaction.objectStore(photoStoreName);
  const elementStore = transaction.objectStore(elementStoreName);

  state.userPhotos
    .filter((photo) => photo.dateKey === snapshot.dateKey)
    .forEach((photo) => photoStore.put(photo));
  snapshot.photos.forEach((photo) => photoStore.put(photo));

  state.canvasElements
    .filter((element) => element.dateKey === snapshot.dateKey)
    .forEach((element) => elementStore.put(element));
  snapshot.elements.forEach((element) => elementStore.put(element));

  await new Promise((resolve, reject) => {
    const oldPhotos = photoStore.index("dateKey").getAllKeys(snapshot.dateKey);
    oldPhotos.onsuccess = () => {
      oldPhotos.result
        .filter((id) => !snapshot.photos.some((photo) => photo.id === id))
        .forEach((id) => photoStore.delete(id));
    };
    oldPhotos.onerror = () => reject(oldPhotos.error);

    const oldElements = elementStore.index("dateKey").getAllKeys(snapshot.dateKey);
    oldElements.onsuccess = () => {
      oldElements.result
        .filter((id) => !snapshot.elements.some((element) => element.id === id))
        .forEach((id) => elementStore.delete(id));
    };
    oldElements.onerror = () => reject(oldElements.error);

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

async function undoLastChange() {
  const day = getDay();
  if (!day) return;

  const stack = undoStackForDate(day.dateKey);
  const snapshot = stack.pop();
  if (!snapshot) return;

  await restoreDaySnapshot(snapshot);
  clearSelection();
  if (!getDay()) {
    state.view = "daybook";
    state.activeDayId = "";
  }
  render();
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image"));
    image.src = url;
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBytes(dataUrl) {
  const [meta, data] = String(dataUrl).split(",");
  const mime = meta.match(/^data:([^;]+);base64$/)?.[1] || "application/octet-stream";
  const binary = atob(data || "");
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return { mime, bytes };
}

function bytesToDataUrl(bytes, mime) {
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:${mime};base64,${btoa(binary)}`;
}

function mimeExtension(mime) {
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return "jpg";
}

function extensionMime(path) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".webp")) return "image/webp";
  return "image/jpeg";
}

function isoDateStamp(date = new Date()) {
  return dateKeyFromDate(date);
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function crc32(bytes) {
  let crc = -1;
  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ -1) >>> 0;
}

function concatBytes(parts) {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  parts.forEach((part) => {
    output.set(part, offset);
    offset += part.length;
  });
  return output;
}

function uint16(value) {
  return new Uint8Array([value & 255, (value >>> 8) & 255]);
}

function uint32(value) {
  return new Uint8Array([
    value & 255,
    (value >>> 8) & 255,
    (value >>> 16) & 255,
    (value >>> 24) & 255
  ]);
}

function createZip(files) {
  const encoder = new TextEncoder();
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  files.forEach((file) => {
    const nameBytes = encoder.encode(file.name);
    const content = file.bytes;
    const crc = crc32(content);
    const localHeader = concatBytes([
      uint32(0x04034b50),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(crc),
      uint32(content.length),
      uint32(content.length),
      uint16(nameBytes.length),
      uint16(0),
      nameBytes
    ]);
    const centralHeader = concatBytes([
      uint32(0x02014b50),
      uint16(20),
      uint16(20),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(crc),
      uint32(content.length),
      uint32(content.length),
      uint16(nameBytes.length),
      uint16(0),
      uint16(0),
      uint16(0),
      uint16(0),
      uint32(0),
      uint32(offset),
      nameBytes
    ]);

    localParts.push(localHeader, content);
    centralParts.push(centralHeader);
    offset += localHeader.length + content.length;
  });

  const centralDirectory = concatBytes(centralParts);
  const end = concatBytes([
    uint32(0x06054b50),
    uint16(0),
    uint16(0),
    uint16(files.length),
    uint16(files.length),
    uint32(centralDirectory.length),
    uint32(offset),
    uint16(0)
  ]);

  return new Blob([concatBytes([...localParts, centralDirectory, end])], { type: "application/zip" });
}

function readUint16(bytes, offset) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readUint32(bytes, offset) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

async function readZip(file) {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const decoder = new TextDecoder();
  let endOffset = -1;
  for (let offset = bytes.length - 22; offset >= 0; offset -= 1) {
    if (readUint32(bytes, offset) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }
  if (endOffset < 0) throw new Error("备份文件不完整，请检查文件。");

  const fileCount = readUint16(bytes, endOffset + 10);
  let directoryOffset = readUint32(bytes, endOffset + 16);
  const files = new Map();

  for (let index = 0; index < fileCount; index += 1) {
    if (readUint32(bytes, directoryOffset) !== 0x02014b50) throw new Error("备份文件目录无效，请检查文件。");

    const method = readUint16(bytes, directoryOffset + 10);
    const size = readUint32(bytes, directoryOffset + 24);
    const nameLength = readUint16(bytes, directoryOffset + 28);
    const extraLength = readUint16(bytes, directoryOffset + 30);
    const commentLength = readUint16(bytes, directoryOffset + 32);
    const localOffset = readUint32(bytes, directoryOffset + 42);
    const name = decoder.decode(bytes.slice(directoryOffset + 46, directoryOffset + 46 + nameLength));

    if (method !== 0) throw new Error("暂不支持压缩格式的备份条目。");
    if (readUint32(bytes, localOffset) !== 0x04034b50) throw new Error("备份文件条目无效，请检查文件。");

    const localNameLength = readUint16(bytes, localOffset + 26);
    const localExtraLength = readUint16(bytes, localOffset + 28);
    const contentOffset = localOffset + 30 + localNameLength + localExtraLength;
    files.set(name, bytes.slice(contentOffset, contentOffset + size));

    directoryOffset += 46 + nameLength + extraLength + commentLength;
  }

  return files;
}

async function compressImage(file) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const maxSide = 1200;
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = Math.min(1, maxSide / longestSide);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, width, height);

    const blob = await new Promise((resolve) => {
      canvas.toBlob(resolve, "image/jpeg", 0.82);
    });

    if (!blob) throw new Error("图片处理失败");
    return {
      imageDataUrl: await blobToDataUrl(blob),
      aspectRatio: width / height
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function clipboardImageDataFromBlob(blob) {
  const [imageDataUrl, image] = await Promise.all([
    blobToDataUrl(blob),
    (async () => {
      const objectUrl = URL.createObjectURL(blob);
      try {
        return await loadImage(objectUrl);
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    })()
  ]);
  const naturalWidth = image.naturalWidth || 1;
  const naturalHeight = image.naturalHeight || 1;

  return {
    imageDataUrl,
    aspectRatio: naturalWidth / naturalHeight || 1,
    naturalWidth,
    naturalHeight
  };
}

async function readClipboardPayload(items) {
  items = Array.from(items || []);
  const itemTypes = items.map((item) => Array.from(item.types || []));
  let payload = null;

  for (const item of items) {
    const imageType = Array.from(item.types || []).find((type) => type.startsWith("image/"));
    if (!imageType) continue;

    try {
      const blob = await item.getType(imageType);
      payload = {
        kind: "image",
        mimeType: imageType,
        blob,
        blobSize: blob.size || 0
      };
      break;
    } catch {
      // Try the next available clipboard item/type.
    }
  }

  if (!payload) {
    for (const item of items) {
      if (!Array.from(item.types || []).includes("text/plain")) continue;

      try {
        const blob = await item.getType("text/plain");
        payload = {
          kind: "text",
          mimeType: "text/plain",
          text: await blob.text(),
          blobSize: blob.size || 0
        };
        break;
      } catch {
        // Try the next text item.
      }
    }
  }

  console.info("[Moments Journal clipboard]", {
    itemCount: items.length,
    itemTypes,
    selectedType: payload?.mimeType || "",
    blobSize: payload?.blobSize || 0
  });

  return payload;
}

async function addClipboardImageSticker(blob) {
  const day = getDay();
  if (!day) return false;

  const undoBefore = snapshotForDate(day.dateKey);
  const image = await clipboardImageDataFromBlob(blob);
  const element = positionCanvasElement(
    defaultClipboardStickerElement(day.dateKey, image),
    visibleCanvasCenterPoint()
  );

  state.activePanel = "";
  await saveCanvasElement(element);
  selectItem("sticker", element.id);
  render();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  if (clampElementToSafeBounds(element.id, "sticker")) {
    await saveCanvasElement(element);
  }
  commitUndoSnapshot(undoBefore);
  render();
  return true;
}

async function addClipboardTextElement(text) {
  const day = getDay();
  const value = String(text || "").trim();
  if (!day || !value) return false;

  const undoBefore = snapshotForDate(day.dateKey);
  const element = positionTextElement(
    defaultTextElement(day.dateKey, value),
    visibleCanvasCenterPoint()
  );

  state.activePanel = "";
  await saveCanvasElement(element);
  selectItem("text", element.id);
  render();
  commitUndoSnapshot(undoBefore);
  render();
  return true;
}

function showClipboardReadError(error) {
  if (error?.name === "NotAllowedError" || error?.name === "SecurityError") {
    showToast("未获得剪贴板读取权限");
    return;
  }

  showToast("粘贴失败，请重试");
}

async function pasteFromClipboard() {
  if (state.isReadingClipboard) return;

  if (!navigator.clipboard?.read) {
    showToast("当前设备暂不支持直接粘贴");
    return;
  }

  let readPromise;
  try {
    readPromise = navigator.clipboard.read();
  } catch (error) {
    showClipboardReadError(error);
    return;
  }

  state.isReadingClipboard = true;
  render();

  try {
    const payload = await readClipboardPayload(await readPromise);
    if (!payload) {
      showToast("未找到可粘贴的图片或文字");
      return;
    }

    const didPaste = payload.kind === "image"
      ? await addClipboardImageSticker(payload.blob)
      : await addClipboardTextElement(payload.text);

    if (!didPaste) showToast("未找到可粘贴的图片或文字");
  } catch (error) {
    showClipboardReadError(error);
  } finally {
    state.isReadingClipboard = false;
    render();
  }
}

async function handlePhotoSelection(event) {
  const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
  const importSource = state.pendingPhotoSource;
  if (!files.length) {
    state.pendingInsertPoint = null;
    state.pendingPhotoSource = "";
    return;
  }

  const imported = [];
  const dateKey = state.pendingImportDateKey || todayDateKey();
  const insertPoint = state.pendingInsertPoint;
  const existingForDay = state.userPhotos.filter((photo) => photo.dateKey === dateKey).length;
  const undoBefore = state.view === "single" && getDay()?.dateKey === dateKey
    ? snapshotForDate(dateKey)
    : null;

  for (const file of files) {
    try {
      const addedAt = new Date().toISOString();
      const compressed = await compressImage(file);
      const photo = {
        id: uid(),
        imageDataUrl: compressed.imageDataUrl,
        aspectRatio: compressed.aspectRatio,
        addedAt,
        dateKey,
        label: ""
      };
      Object.assign(photo, generateLayout(photo, existingForDay + imported.length));
      if (state.view === "single" && insertPoint) {
        positionPhotoElement(photo, {
          x: insertPoint.x + imported.length * 16,
          y: insertPoint.y + imported.length * 16
        });
      }
      imported.push(photo);
    } catch {
      // Skip files that fail to load or compress.
    }
  }

  if (!imported.length) {
    state.pendingInsertPoint = null;
    state.pendingPhotoSource = "";
    window.alert("未能导入照片。");
    return;
  }

  try {
    await saveUserPhotos(imported);
  } catch {
    state.pendingInsertPoint = null;
    state.pendingPhotoSource = "";
    window.alert("照片已处理，但无法保存到本地。");
    return;
  }

  if (importSource === "empty-home") {
    state.view = "single";
    state.activeDayId = `user-${dateKey}`;
    selectItem("photo", imported[0].id);
  } else if (state.view === "single") {
    state.activeDayId = `user-${dateKey}`;
    selectItem("photo", imported[0].id);
    commitUndoSnapshot(undoBefore);
  }

  state.pendingInsertPoint = null;
  state.pendingPhotoSource = "";
  render();
}

function getUserPhoto(photoId) {
  return state.userPhotos.find((photo) => photo.id === photoId);
}

function selectPhoto(photoId) {
  const photo = getUserPhoto(photoId);
  if (!photo) return;

  selectItem("photo", photoId);
  const maxZ = state.userPhotos.reduce((max, item) => Math.max(max, item.zIndex || 0), 0);
  photo.zIndex = maxZ + 1;
  updateUserPhoto(photo);
  render();
}

async function deleteSelectedPhoto(photoId) {
  const undoBefore = currentUndoSnapshot();
  await deleteUserPhoto(photoId);
  clearSelection();

  const day = getDay();
  if (!day) {
    state.view = "daybook";
    state.activeDayId = "";
  }

  commitUndoSnapshot(undoBefore);
  render();
}

async function deleteSelectedElement(elementId) {
  const undoBefore = currentUndoSnapshot();
  await deleteCanvasElement(elementId);
  clearSelection();
  commitUndoSnapshot(undoBefore);
  render();
}

async function addTextElement(point = null) {
  const day = getDay();
  if (!day) return;

  const undoBefore = snapshotForDate(day.dateKey);
  const element = positionTextElement(defaultTextElement(day.dateKey), point);
  state.pendingInsertPoint = null;
  state.activePanel = "text";
  await saveCanvasElement(element);
  selectItem("text", element.id);
  openTextComposer(element.id, { beforeSnapshot: undoBefore });
}

function focusTextComposer() {
  window.setTimeout(() => {
    const input = document.querySelector("#textComposerInput");
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, 0);
}

function textComposerDefaults() {
  return {
    active: false,
    editingId: "",
    value: "",
    fontSize: textDefaults.fontSize,
    color: textDefaults.color,
    fontWeight: textDefaults.fontWeight,
    backgroundStyle: textDefaults.backgroundStyle,
    beforeSnapshot: null
  };
}

function resetTextComposer() {
  state.textComposer = textComposerDefaults();
}

function ensureTextElementStyle(element) {
  if (!element || element.type !== "text") return null;
  if (typeof element.fontSize !== "number") element.fontSize = textDefaults.fontSize;
  if (!element.color) element.color = textDefaults.color;
  if (!element.fontWeight) element.fontWeight = textDefaults.fontWeight;
  element.backgroundStyle = normalizedTextBackgroundStyle(element.backgroundStyle);
  if (!element.fontFamily) element.fontFamily = "-apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif";
  if (!element.textAlign) element.textAlign = "center";
  if (!element.letterSpacing) element.letterSpacing = "0";
  return element;
}

function beginTextEditorSession(element, options = {}) {
  if (!ensureTextElementStyle(element)) return;
  syncTextLayoutSize(element);
  const previousSnapshot = state.textComposer.editingId === element.id ? state.textComposer.beforeSnapshot : null;
  state.activePanel = "text";
  state.textComposer = {
    active: true,
    editingId: element.id,
    value: element.content || "",
    fontSize: element.fontSize,
    color: element.color,
    fontWeight: element.fontWeight,
    backgroundStyle: element.backgroundStyle,
    beforeSnapshot: previousSnapshot || options.beforeSnapshot || currentUndoSnapshot()
  };
}

function openTextComposer(editingId = "", options = {}) {
  const element = editingId ? getCanvasElement(editingId) : null;
  if (element?.type === "text") {
    beginTextEditorSession(element, options);
    selectItem("text", element.id);
  } else {
    resetTextComposer();
    clearSelection();
  }
  render();
  focusTextComposer();
}

async function completeTextComposer() {
  const value = state.textComposer.value.trim();
  const editingId = state.textComposer.editingId;
  const beforeSnapshot = state.textComposer.beforeSnapshot;
  resetTextComposer();
  state.activePanel = "";

  const editingElement = editingId ? getCanvasElement(editingId) : null;
  if (!value) {
    if (editingElement?.type === "text") {
      await deleteCanvasElement(editingElement.id);
      clearSelection();
      commitUndoSnapshot(beforeSnapshot);
    }
    state.pendingInsertPoint = null;
    render();
    return;
  }

  if (editingElement?.type === "text") {
    ensureTextElementStyle(editingElement);
    editingElement.content = value;
    syncTextLayoutSize(editingElement);
    await saveCanvasElement(editingElement);
    selectItem("text", editingElement.id);
    commitUndoSnapshot(beforeSnapshot);
  }

  state.pendingInsertPoint = null;
  render();
}

async function addStickerElement(sticker) {
  const day = getDay();
  if (!day) return;

  const element = positionCanvasElement(
    defaultStickerElement(day.dateKey, sticker),
    visibleCanvasCenterPoint()
  );
  const undoBefore = snapshotForDate(day.dateKey);
  debugInteraction("add sticker", {
    stickerType: sticker.stickerType,
    content: sticker.content || "",
    elementId: element.id
  });
  state.activePanel = "";
  state.stickerImagePickerOpen = false;
  state.customStickerManageMode = false;
  state.stickerSheetState = "collapsed";
  await saveCanvasElement(element);
  selectItem("sticker", element.id);
  render();
  await new Promise((resolve) => requestAnimationFrame(resolve));
  if (clampElementToSafeBounds(element.id, "sticker")) {
    await saveCanvasElement(element);
  }
  commitUndoSnapshot(undoBefore);
  setDeleteZoneVisible(false);
  debugInteraction("close sticker sheet after select", { elementId: element.id });
  render();
}

function openCustomStickerPicker() {
  const input = document.querySelector("#stickerInput");
  input.value = "";
  input.click();
}

async function handleCustomStickerSelection(event) {
  const file = Array.from(event.target.files || []).find((item) => item.type.startsWith("image/"));
  if (!file) return;

  try {
    const compressed = await compressImage(file);
    const sticker = {
      id: uid("custom-sticker"),
      type: "custom-image-sticker",
      stickerType: "image",
      src: compressed.imageDataUrl,
      imageDataUrl: compressed.imageDataUrl,
      aspectRatio: compressed.aspectRatio,
      createdAt: new Date().toISOString()
    };
    await saveCustomSticker(sticker);
    await addStickerElement(sticker);
  } catch {
    window.alert("无法添加这个贴纸。");
  }
}

function backupImageRecord(record, folder, files) {
  if (!record.imageDataUrl) return record;

  const { mime, bytes } = dataUrlToBytes(record.imageDataUrl);
  const imagePath = `images/${folder}/${record.id}.${mimeExtension(mime)}`;
  files.push({ name: imagePath, bytes });
  const clone = { ...record, imagePath, imageMime: mime };
  delete clone.imageDataUrl;
  if (clone.src) delete clone.src;
  return clone;
}

function backupCanvasElement(element, files) {
  if (element.imageDataUrl) return backupImageRecord(element, "elements", files);
  return { ...element };
}

function buildBackupFiles() {
  const encoder = new TextEncoder();
  const files = [];
  const backup = {
    schemaVersion: backupSchemaVersion,
    appVersion,
    exportedAt: new Date().toISOString(),
    notes: deepClone(state.notes),
    photos: state.userPhotos.map((photo) => backupImageRecord(photo, "photos", files)),
    canvasElements: state.canvasElements.map((element) => backupCanvasElement(element, files)),
    customStickers: state.customStickers.map((sticker) => backupImageRecord(sticker, "stickers", files))
  };

  files.unshift({
    name: "backup.json",
    bytes: encoder.encode(JSON.stringify(backup, null, 2))
  });

  return files;
}

function hydrateImageRecord(record, files) {
  const clone = { ...record };
  if (!clone.imagePath) return clone;

  const imageBytes = files.get(clone.imagePath);
  if (!imageBytes) throw new Error(`备份缺少图片文件：${clone.imagePath}`);

  clone.imageDataUrl = bytesToDataUrl(imageBytes, clone.imageMime || extensionMime(clone.imagePath));
  delete clone.imagePath;
  delete clone.imageMime;
  return clone;
}

function validateBackupPayload(backup) {
  if (!backup || typeof backup !== "object") throw new Error("备份文件无效。");
  if (!backup.schemaVersion) throw new Error("备份文件缺少版本信息。");
  if (!Array.isArray(backup.photos)) throw new Error("备份文件缺少照片数据。");
  if (!Array.isArray(backup.canvasElements)) throw new Error("备份文件缺少页面元素数据。");
  if (!Array.isArray(backup.customStickers)) throw new Error("备份文件缺少贴纸数据。");

  backup.photos.forEach((photo) => {
    if (!photo.id || !photo.dateKey || !photo.addedAt || !photo.imageDataUrl) {
      throw new Error("备份文件中有不完整的照片记录。");
    }
  });
}

async function parseBackupFile(file) {
  const files = await readZip(file);
  const backupBytes = files.get("backup.json");
  if (!backupBytes) throw new Error("备份文件缺少 backup.json。");

  const backup = JSON.parse(new TextDecoder().decode(backupBytes));
  const hydrated = {
    schemaVersion: backup.schemaVersion,
    appVersion: backup.appVersion || "",
    exportedAt: backup.exportedAt || "",
    notes: backup.notes && typeof backup.notes === "object" ? backup.notes : {},
    photos: (backup.photos || []).map((photo) => hydrateImageRecord(photo, files)),
    canvasElements: (backup.canvasElements || []).map((element) => hydrateImageRecord(element, files)),
    customStickers: (backup.customStickers || []).map((sticker) => hydrateImageRecord(sticker, files))
  };

  validateBackupPayload(hydrated);
  return hydrated;
}

async function replacePersistedData(nextData) {
  if (state.storageMode === "localStorage") {
    localStorage.setItem(localPhotosKey, JSON.stringify(nextData.photos));
    localStorage.setItem(localElementsKey, JSON.stringify(nextData.canvasElements));
    localStorage.setItem(localCustomStickersKey, JSON.stringify(nextData.customStickers));
    return;
  }

  const transaction = state.db.transaction([photoStoreName, elementStoreName, customStickerStoreName], "readwrite");
  const photoStore = transaction.objectStore(photoStoreName);
  const elementStore = transaction.objectStore(elementStoreName);
  const stickerStore = transaction.objectStore(customStickerStoreName);

  photoStore.clear();
  elementStore.clear();
  stickerStore.clear();
  nextData.photos.forEach((photo) => photoStore.put(photo));
  nextData.canvasElements.forEach((element) => elementStore.put(element));
  nextData.customStickers.forEach((sticker) => stickerStore.put(sticker));

  await transactionDone(transaction);
}

async function exportBackup() {
  if (state.isExportingBackup) return;

  state.isExportingBackup = true;
  render();

  try {
    const filename = `Photo-Journal-Backup-${isoDateStamp()}.zip`;
    const zipBlob = createZip(buildBackupFiles());
    downloadBlob(zipBlob, filename);
    showToast("备份已导出");
  } catch (error) {
    showToast(error?.message || "备份导出失败，请重试");
  } finally {
    state.isExportingBackup = false;
    state.settingsSheetOpen = false;
    render();
  }
}

function openBackupPicker() {
  const input = document.querySelector("#backupInput");
  input.value = "";
  input.click();
}

async function handleBackupRestoreSelection(event) {
  const file = Array.from(event.target.files || [])[0];
  if (!file) return;

  let parsed;
  try {
    parsed = await parseBackupFile(file);
  } catch (error) {
    showToast(error?.message || "恢复失败，请检查备份文件");
    return;
  }

  const confirmed = window.confirm("确认恢复备份？\n\n恢复后，当前数据将被备份文件中的内容替换。此操作无法撤销。");
  if (!confirmed) return;

  const previousData = {
    photos: deepClone(state.userPhotos),
    canvasElements: deepClone(state.canvasElements),
    customStickers: deepClone(state.customStickers),
    notes: deepClone(state.notes)
  };

  try {
    await replacePersistedData(parsed);
    state.userPhotos = parsed.photos;
    state.canvasElements = parsed.canvasElements;
    state.customStickers = parsed.customStickers;
    state.notes = parsed.notes;
    saveNotes();
    state.undoHistory = {};
    state.settingsSheetOpen = false;
    state.view = "home";
    state.activeDayId = "";
    clearSelection();
    render();
    showToast("备份恢复成功");
  } catch (error) {
    state.userPhotos = previousData.photos;
    state.canvasElements = previousData.canvasElements;
    state.customStickers = previousData.customStickers;
    state.notes = previousData.notes;
    saveNotes();
    try {
      await replacePersistedData(previousData);
    } catch {
      // Keep in-memory state intact if the rollback write also fails.
    }
    render();
    showToast(error?.message || "恢复失败，请检查备份文件");
  }
}

function drawContainedImage(context, image, width, height) {
  const imageRatio = image.naturalWidth / image.naturalHeight || 1;
  const boxRatio = width / height || 1;
  let drawWidth = width;
  let drawHeight = height;

  if (imageRatio > boxRatio) {
    drawHeight = width / imageRatio;
  } else {
    drawWidth = height * imageRatio;
  }

  context.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
}

async function drawTransformedItem(context, item, itemType, offsetY, draw) {
  const textLayout = measureTextLayout(
    item.content,
    item.fontSize || textDefaults.fontSize,
    item.backgroundStyle || textDefaults.backgroundStyle
  );
  const width = item.width || textLayout.width;
  const height = item.height || textLayout.height;
  context.save();
  context.translate(item.x + width / 2, offsetY + item.y + height / 2);
  context.rotate(((item.rotation || 0) * Math.PI) / 180);
  context.scale(item.scale || 1, item.scale || 1);
  await draw(width, height);
  context.restore();
}

function drawTextLines(context, text, width, fontSize, textAlign = "center") {
  const lines = String(text || "").split("\n");
  const lineHeight = fontSize * 1.15;
  context.textAlign = textAlign;
  context.textBaseline = "middle";
  const x = textAlign === "left" ? -width / 2 : textAlign === "right" ? width / 2 : 0;
  const startY = -((lines.length - 1) * lineHeight) / 2;
  lines.forEach((line, index) => {
    context.fillText(line, x, startY + index * lineHeight);
  });
}

function drawRoundedRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function drawTextBackground(context, backgroundStyle, width, height) {
  const style = normalizedTextBackgroundStyle(backgroundStyle);
  if (style === "none") return;

  context.save();
  context.shadowColor = style === "glass" ? "rgba(0, 0, 0, 0.08)" : "rgba(0, 0, 0, 0.1)";
  context.shadowBlur = style === "glass" ? 12 : 10;
  context.shadowOffsetY = 4;
  context.fillStyle = style === "glass" ? "rgba(255, 255, 255, 0.58)" : "#ffffff";
  drawRoundedRect(context, -width / 2, -height / 2, width, height, style === "pill" ? height / 2 : 10);
  context.fill();
  context.restore();
}

async function dayCanvasBlob(day) {
  const exportScale = 2;
  const headerHeight = 104;
  const width = canvasWidth;
  const height = headerHeight + canvasHeight;
  const canvas = document.createElement("canvas");
  canvas.width = width * exportScale;
  canvas.height = height * exportScale;
  const context = canvas.getContext("2d");
  context.scale(exportScale, exportScale);
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);

  const label = relativeLabel(day.dateKey);
  context.fillStyle = "#222222";
  context.font = "600 22px -apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label.date, width / 2, 28);
  context.fillStyle = "#8a8a8a";
  context.font = "400 16px -apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif";
  context.fillText(`· ${label.detail}`, width / 2, 52);
  const note = noteFor(day);
  if (note) {
    context.fillStyle = "#777777";
    context.font = "400 14px -apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif";
    context.fillText(note, width / 2, 76);
  }

  const items = [
    ...day.photos.map((photo) => ({ ...photo, itemType: "photo" })),
    ...elementsForDate(day.dateKey).map((element) => ({ ...element, itemType: element.type }))
  ].sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  for (const item of items) {
    if (item.itemType === "photo") {
      const image = await loadImage(item.imageDataUrl || item.src);
      await drawTransformedItem(context, item, "photo", headerHeight, async (itemWidth, itemHeight) => {
        context.save();
        context.shadowColor = "rgba(0, 0, 0, 0.08)";
        context.shadowBlur = 18;
        context.shadowOffsetY = 8;
        drawContainedImage(context, image, itemWidth, itemHeight);
        context.restore();
      });
    } else if (item.itemType === "text") {
      const fontSize = item.fontSize || textDefaults.fontSize;
      const backgroundStyle = normalizedTextBackgroundStyle(item.backgroundStyle);
      await drawTransformedItem(context, item, "text", headerHeight, async (itemWidth, itemHeight) => {
        const padding = textBackgroundPadding(backgroundStyle);
        drawTextBackground(context, backgroundStyle, itemWidth, itemHeight);
        context.fillStyle = item.color || textDefaults.color;
        context.font = `${item.fontWeight || textDefaults.fontWeight} ${fontSize}px ${item.fontFamily || "-apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif"}`;
        drawTextLines(context, item.content, Math.max(1, itemWidth - padding.x * 2), fontSize, item.textAlign || "center");
      });
    } else if (item.stickerType === "image" && item.imageDataUrl) {
      const image = await loadImage(item.imageDataUrl);
      await drawTransformedItem(context, item, "sticker", headerHeight, async (itemWidth, itemHeight) => {
        drawContainedImage(context, image, itemWidth, itemHeight);
      });
    } else {
      await drawTransformedItem(context, item, "sticker", headerHeight, async (itemWidth) => {
        context.fillStyle = item.color || "#222222";
        context.font = item.stickerType === "text"
          ? `800 ${item.fontSize || 22}px Georgia, serif`
          : `${item.fontSize || 48}px -apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif`;
        if (item.stickerType === "text") {
          context.lineWidth = 4;
          context.strokeStyle = "#ffffff";
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.strokeText(item.content, 0, 0);
        }
        drawTextLines(context, item.content, itemWidth, item.fontSize || 48, "center");
      });
    }
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("导出图片失败，请重试"));
    }, "image/png");
  });
}

async function exportCurrentDayImage() {
  const day = getDay();
  if (!day || state.isExportingDay) return;

  const previousSelection = {
    selectedPhotoId: state.selectedPhotoId,
    selectedSurface: state.selectedSurface,
    selectedItemType: state.selectedItemType
  };

  state.isExportingDay = true;
  clearSelection();
  render();

  try {
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const blob = await dayCanvasBlob(day);
    const filename = `Photo-Journal-${day.dateKey}.png`;
    const file = new File([blob], filename, { type: "image/png" });

    if (navigator.canShare?.({ files: [file] }) && navigator.share) {
      await navigator.share({ files: [file], title: "Moments Journal" });
    } else {
      downloadBlob(blob, filename);
    }

    showToast("导出完成");
  } catch (error) {
    showToast(error?.message || "导出失败，请重试");
  } finally {
    state.isExportingDay = false;
    state.selectedPhotoId = previousSelection.selectedPhotoId;
    state.selectedSurface = previousSelection.selectedSurface;
    state.selectedItemType = previousSelection.selectedItemType;
    render();
  }
}

async function editTextElement(elementId) {
  const element = getCanvasElement(elementId);
  if (!element || element.type !== "text") return;

  openTextComposer(element.id);
}

function selectedTextElement() {
  if (state.selectedItemType !== "text") return null;
  const element = getCanvasElement(state.selectedPhotoId);
  return element?.type === "text" ? element : null;
}

async function updateSelectedTextElement(updater) {
  const element = selectedTextElement();
  if (!element) return;

  ensureTextElementStyle(element);
  updater(element);
  syncTextLayoutSize(element);
  await saveCanvasElement(element);
  render();
}

function applyTextElementDom(element) {
  const node = elementForItem(element.id, "text");
  if (!node) return;

  node.textContent = element.content || "";
  node.dataset.backgroundStyle = normalizedTextBackgroundStyle(element.backgroundStyle);
  node.style.setProperty("--font-size", `${element.fontSize}px`);
  node.style.setProperty("--font-family", element.fontFamily);
  node.style.setProperty("--font-weight", element.fontWeight);
  node.style.setProperty("--font-color", element.color);
  node.style.setProperty("--text-align", element.textAlign);
  node.style.setProperty("--letter-spacing", element.letterSpacing || "0");
}

async function applyTextComposerPatch(patch, options = {}) {
  const editingId = state.textComposer.editingId || state.selectedPhotoId;
  const element = editingId ? getCanvasElement(editingId) : null;
  if (!ensureTextElementStyle(element)) return;

  if (state.textComposer.editingId !== element.id) {
    beginTextEditorSession(element);
  }

  Object.assign(state.textComposer, patch);
  element.content = state.textComposer.value;
  element.fontSize = Number(state.textComposer.fontSize) || textDefaults.fontSize;
  element.color = state.textComposer.color || textDefaults.color;
  element.fontWeight = state.textComposer.fontWeight || textDefaults.fontWeight;
  element.backgroundStyle = normalizedTextBackgroundStyle(state.textComposer.backgroundStyle);
  syncTextLayoutSize(element);
  applyTextElementDom(element);
  await saveCanvasElement(element);

  if (options.renderControls) render();
}

function textStyle(styleId) {
  return {
    classic: {
      fontFamily: "-apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif",
      fontWeight: "600",
      letterSpacing: "0"
    },
    signature: {
      fontFamily: "Brush Script MT, cursive",
      fontWeight: "400",
      letterSpacing: "0"
    },
    editor: {
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
      fontWeight: "500",
      letterSpacing: "0.02em"
    },
    poster: {
      fontFamily: "Georgia, serif",
      fontWeight: "700",
      letterSpacing: "0"
    }
  }[styleId];
}

function surfaceDimensions(surface) {
  return { width: canvasWidth, height: canvasHeight };
}

function getInteractiveLayout(itemId, itemType) {
  return itemType === "photo" ? getUserPhoto(itemId) : getCanvasElement(itemId);
}

function itemAspectRatio(item, itemType) {
  if (itemType === "photo") return item.aspectRatio || item.width / item.height || 1;
  return item.width / item.height || 1;
}

function syncTextLayoutSize(element) {
  if (!element || element.type !== "text") return;
  ensureTextElementStyle(element);
  const size = measureTextLayout(element.content, element.fontSize || textDefaults.fontSize, element.backgroundStyle);
  element.width = size.width;
  element.height = size.height;
}

async function persistInteractiveLayout(itemId, itemType) {
  if (itemType === "photo") {
    const photo = getUserPhoto(itemId);
    if (photo) await updateUserPhoto(photo);
    return;
  }

  const element = getCanvasElement(itemId);
  if (element) await saveCanvasElement(element);
}

function elementForItem(itemId, itemType) {
  return document.querySelector(`[data-item-type="${itemType}"][data-item-id="${itemId}"]`);
}

function debugInteraction(message, details = {}) {
  void message;
  void details;
}

function activePointersForItem(itemId, itemType) {
  return Array.from(activePointers.values())
    .filter((pointer) => pointer.itemId === itemId && pointer.itemType === itemType);
}

function distanceBetween(pointerA, pointerB) {
  return Math.hypot(pointerB.x - pointerA.x, pointerB.y - pointerA.y);
}

function angleBetween(pointerA, pointerB) {
  return Math.atan2(pointerB.y - pointerA.y, pointerB.x - pointerA.x);
}

function centerBetween(pointerA, pointerB) {
  return {
    x: (pointerA.x + pointerB.x) / 2,
    y: (pointerA.y + pointerB.y) / 2
  };
}

function normalizeAngleDelta(degrees) {
  return ((degrees + 180) % 360 + 360) % 360 - 180;
}

function scaleBoundsForItem(itemType) {
  return itemType === "text"
    ? { min: minTextScale, max: maxTextScale }
    : { min: minItemScale, max: maxItemScale };
}

function freeMoveBoundsForLayout(layout, itemType, dimensions = surfaceDimensions("day")) {
  const width = Math.max(1, (layout?.width || 1) * (layout?.scale || 1));
  const height = Math.max(1, (layout?.height || 1) * (layout?.scale || 1));

  if (itemType === "text") {
    return {
      minX: -dimensions.width,
      maxX: dimensions.width * 2,
      minY: -200,
      maxY: dimensions.height + 200
    };
  }

  if (itemType === "sticker" || itemType === "emoji") {
    return {
      minX: -width * 0.5,
      maxX: dimensions.width - width * 0.5,
      minY: -height * 0.5,
      maxY: dimensions.height - height * 0.5
    };
  }

  return {
    minX: -40,
    maxX: dimensions.width - 40,
    minY: -40,
    maxY: dimensions.height - 40
  };
}

function applyInteractiveStyle(element, layout, itemType) {
  if (!element || !layout) return;

  element.style.left = `${layout.x}px`;
  element.style.top = `${layout.y}px`;
  const visualZIndex = element.classList.contains("is-gesturing")
    ? Math.max(layout.zIndex || 1, 1300)
    : layout.zIndex || 1;
  element.style.zIndex = String(visualZIndex);
  element.style.setProperty("--rotation", `${layout.rotation || 0}deg`);
  element.style.setProperty("--scale", layout.scale || 1);

  element.style.width = itemType === "text" ? "max-content" : `${layout.width}px`;
  element.style.height = itemType === "text" ? "auto" : `${layout.height}px`;
  if (itemType === "text") {
    element.style.maxWidth = "none";
    element.style.minWidth = "0";
  }

  if (layout.fontSize) element.style.setProperty("--font-size", `${layout.fontSize}px`);
  if (itemType === "text") {
    element.style.setProperty("--font-weight", layout.fontWeight || textDefaults.fontWeight);
    element.style.setProperty("--font-color", layout.color || textDefaults.color);
    element.dataset.backgroundStyle = normalizedTextBackgroundStyle(layout.backgroundStyle);
  }
}

function overlapSize(rect, bounds) {
  return {
    width: Math.max(0, Math.min(rect.right, bounds.right) - Math.max(rect.left, bounds.left)),
    height: Math.max(0, Math.min(rect.bottom, bounds.bottom) - Math.max(rect.top, bounds.top))
  };
}

function getEditableSafeBounds(options = {}) {
  const canvas = document.querySelector(".free-canvas");
  const canvasRect = canvas?.getBoundingClientRect();
  if (!canvasRect?.width || !canvasRect?.height) return null;

  const toolboxRects = Array.from(document.querySelectorAll(".floating-toolbox button"))
    .map((button) => button.getBoundingClientRect())
    .filter((rect) => rect.width && rect.height);
  if (options.requireToolbox && !toolboxRects.length) return null;

  const overlappingToolboxRects = toolboxRects.filter((rect) => (
    rect.bottom > canvasRect.top
    && rect.top < canvasRect.bottom
    && rect.right > canvasRect.left
    && rect.left < canvasRect.right
  ));
  const toolboxLeft = overlappingToolboxRects.length
    ? Math.min(...overlappingToolboxRects.map((rect) => rect.left))
    : canvasRect.right;
  const rightInset = 10;
  const right = clamp(
    Math.min(canvasRect.right, toolboxLeft - rightInset),
    canvasRect.left + 72,
    canvasRect.right
  );

  return {
    left: canvasRect.left,
    top: canvasRect.top,
    right,
    bottom: canvasRect.bottom,
    canvasRect,
    scaleX: canvasWidth / canvasRect.width,
    scaleY: canvasHeight / canvasRect.height
  };
}

function requiredVisibleSize(rect) {
  return {
    width: Math.min(44, Math.max(24, rect.width <= 44 ? rect.width * 0.75 : 44)),
    height: Math.min(44, Math.max(24, rect.height <= 44 ? rect.height * 0.75 : 44))
  };
}

function isElementRecoverable(rect, bounds) {
  const overlap = overlapSize(rect, bounds);
  const required = requiredVisibleSize(rect);
  return overlap.width >= Math.min(required.width, bounds.right - bounds.left)
    && overlap.height >= Math.min(required.height, bounds.bottom - bounds.top);
}

function clampElementToSafeBounds(itemId, itemType, options = {}) {
  const layout = getInteractiveLayout(itemId, itemType);
  const element = elementForItem(itemId, itemType);
  const bounds = getEditableSafeBounds(options);
  if (!layout || !element || !bounds) return false;

  let changed = false;
  for (let index = 0; index < 2; index += 1) {
    const rect = element.getBoundingClientRect();
    if (isElementRecoverable(rect, bounds)) break;

    const required = requiredVisibleSize(rect);
    let dx = 0;
    let dy = 0;

    if (rect.right < bounds.left + required.width) {
      dx = bounds.left + required.width - rect.right;
    } else if (rect.left > bounds.right - required.width) {
      dx = bounds.right - required.width - rect.left;
    }

    if (rect.bottom < bounds.top + required.height) {
      dy = bounds.top + required.height - rect.bottom;
    } else if (rect.top > bounds.bottom - required.height) {
      dy = bounds.bottom - required.height - rect.top;
    }

    if (!dx && !dy) break;
    layout.x = Math.round((layout.x || 0) + dx * bounds.scaleX);
    layout.y = Math.round((layout.y || 0) + dy * bounds.scaleY);
    applyInteractiveStyle(element, layout, itemType);
    changed = true;
  }

  return changed;
}

async function repairUnsafeCanvasItems(options = {}) {
  const day = getDay();
  if (!day || state.view !== "single") return;

  const repairs = [];
  day.photos.forEach((photo) => {
    if (clampElementToSafeBounds(photo.id, "photo", options)) {
      const currentPhoto = getUserPhoto(photo.id);
      if (currentPhoto) repairs.push(updateUserPhoto(currentPhoto));
    }
  });
  elementsForDate(day.dateKey).forEach((element) => {
    if (clampElementToSafeBounds(element.id, element.type, options)) repairs.push(saveCanvasElement(element));
  });

  if (repairs.length) await Promise.all(repairs);
}

function scheduleCanvasSafetyRepair() {
  if (state.view !== "single" || canvasSafetyRepairFrame) return;
  canvasSafetyRepairFrame = requestAnimationFrame(() => {
    canvasSafetyRepairFrame = 0;
    repairUnsafeCanvasItems({ requireToolbox: true });
  });
}

function stickerSheetElement() {
  return document.querySelector("[data-sticker-sheet]");
}

function stickerSheetHeights() {
  const viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
  return {
    preview: viewportHeight * 0.35,
    collapsed: viewportHeight * 0.55,
    expanded: viewportHeight * 0.9
  };
}

function stickerSheetStateFromHeight(height, heights) {
  return ["preview", "collapsed", "expanded"]
    .map((stateName) => ({
      stateName,
      distance: Math.abs(height - heights[stateName])
    }))
    .sort((a, b) => a.distance - b.distance)[0].stateName;
}

function startStickerSheetDrag(event) {
  const sheet = stickerSheetElement();
  if (!sheet || event.pointerId === undefined) return;

  event.preventDefault();
  event.stopPropagation();
  const rect = sheet.getBoundingClientRect();
  stickerSheetDrag.active = true;
  stickerSheetDrag.pointerId = event.pointerId;
  stickerSheetDrag.startY = event.clientY;
  stickerSheetDrag.startState = ["preview", "collapsed", "expanded"].includes(state.stickerSheetState)
    ? state.stickerSheetState
    : "collapsed";
  stickerSheetDrag.startHeight = rect.height || stickerSheetHeights()[stickerSheetDrag.startState];
  stickerSheetDrag.currentHeight = stickerSheetDrag.startHeight;
  stickerSheetDrag.currentOffset = 0;
  sheet.classList.add("is-dragging");
  event.target.closest("[data-sticker-sheet-handle]")?.setPointerCapture?.(event.pointerId);
}

function moveStickerSheetDrag(event) {
  if (!stickerSheetDrag.active || event.pointerId !== stickerSheetDrag.pointerId) return;

  event.preventDefault();
  const sheet = stickerSheetElement();
  if (!sheet) return;

  const heights = stickerSheetHeights();
  const dy = event.clientY - stickerSheetDrag.startY;
  const rawHeight = stickerSheetDrag.startHeight - dy;
  const targetHeight = clamp(rawHeight, heights.preview, heights.expanded);
  const offset = clamp(heights.preview - rawHeight, 0, heights.preview);

  stickerSheetDrag.currentHeight = targetHeight;
  stickerSheetDrag.currentOffset = offset;
  sheet.style.height = `${targetHeight}px`;
  sheet.style.setProperty("--sheet-drag-y", `${offset}px`);
}

function endStickerSheetDrag(event) {
  if (!stickerSheetDrag.active || event.pointerId !== stickerSheetDrag.pointerId) return;

  const sheet = stickerSheetElement();
  const heights = stickerSheetHeights();
  const totalDy = event.clientY - stickerSheetDrag.startY;
  const shouldClose = stickerSheetDrag.currentOffset > Math.min(96, heights.preview * 0.32);
  const nextState = stickerSheetStateFromHeight(stickerSheetDrag.currentHeight, heights);

  sheet?.classList.remove("is-dragging");
  if (sheet) {
    sheet.style.height = "";
    sheet.style.removeProperty("--sheet-drag-y");
  }

  stickerSheetDrag.active = false;
  stickerSheetDrag.pointerId = null;
  stickerSheetDrag.currentOffset = 0;
  stickerSheetDrag.ignoreNextToggle = Math.abs(totalDy) > 6;

  if (shouldClose) {
    state.activePanel = "";
  } else {
    state.stickerSheetState = nextState;
  }
  render();
}

function deleteZoneElement() {
  return document.querySelector(".delete-zone");
}

function setDeleteZoneVisible(isVisible, isActive = false) {
  const zone = deleteZoneElement();
  if (!zone) return;

  const wasVisible = zone.classList.contains("is-visible");
  zone.classList.toggle("is-visible", isVisible);
  zone.classList.toggle("is-active", isVisible && isActive);
  zone.classList.toggle("is-over", isVisible && isActive);

  const copy = zone.querySelector(".delete-zone-copy");
  if (copy) {
    copy.textContent = isVisible && isActive
      ? copy.dataset.activeCopy
      : copy.dataset.idleCopy;
  }

  if (isVisible && !wasVisible) debugInteraction("show delete zone");
}

function isPointerInDeleteZone(clientY) {
  return clientY > window.innerHeight - deleteActiveHeight;
}

function deleteZoneState(clientY) {
  if (clientY > window.innerHeight - deleteActiveHeight) return "active";
  if (clientY > window.innerHeight - deleteRevealHeight) return "reveal";
  return "hidden";
}

function updateDragDeleteFeedback(event) {
  const zoneState = deleteZoneState(event.clientY);
  const shouldShowDeleteZone = zoneState !== "hidden";
  const isOverDeleteZone = zoneState === "active";
  const element = elementForItem(gesture.itemId, gesture.itemType);
  const wasOverDeleteZone = gesture.overDeleteZone;

  gesture.overDeleteZone = isOverDeleteZone;
  setDeleteZoneVisible(shouldShowDeleteZone, isOverDeleteZone);
  element?.classList.toggle("is-over-delete", isOverDeleteZone);

  if (isOverDeleteZone !== wasOverDeleteZone) {
    debugInteraction("over delete zone", {
      elementId: gesture.itemId,
      itemType: gesture.itemType,
      isOverDeleteZone
    });
  }
}

async function deleteInteractiveItem(itemId, itemType, beforeSnapshot = currentUndoSnapshot()) {
  debugInteraction("delete element", { elementId: itemId, itemType });

  if (itemType === "photo") {
    await deleteUserPhoto(itemId);

    if (!getDay()) {
      state.view = "daybook";
      state.activeDayId = "";
    }
  } else {
    await deleteCanvasElement(itemId);
  }

  clearSelection();
  commitUndoSnapshot(beforeSnapshot);
  render();
}

function capturePointerForGesture(element, pointerId) {
  if (!element || pointerId === undefined) return;
  element.setPointerCapture?.(pointerId);
  if (!gesture.capturedPointers.some((pointer) => pointer.element === element && pointer.pointerId === pointerId)) {
    gesture.capturedPointers.push({ element, pointerId });
  }
  gesture.capturedElement = gesture.capturedElement || element;
}

function startPinchGesture(event, itemId, itemType) {
  const layout = getInteractiveLayout(itemId, itemType);
  const pointers = activePointersForItem(itemId, itemType);
  if (!layout || pointers.length < 2) return false;

  event.preventDefault();
  const gestureElement = event.target.closest(".canvas-item") || elementForItem(itemId, itemType);
  capturePointerForGesture(gestureElement, event.pointerId);
  selectItem(itemType, itemId);
  setDeleteZoneVisible(false);

  const center = centerBetween(pointers[0], pointers[1]);
  gesture.active = true;
  gesture.mode = "pinch";
  gesture.itemId = itemId;
  gesture.itemType = itemType;
  gesture.surface = "day";
  gesture.startX = layout.x || 0;
  gesture.startY = layout.y || 0;
  gesture.startScale = layout.scale || 1;
  gesture.startRotation = layout.rotation || 0;
  gesture.startPinchDistance = Math.max(1, distanceBetween(pointers[0], pointers[1]));
  gesture.startPinchAngle = angleBetween(pointers[0], pointers[1]);
  gesture.startPinchCenterX = center.x;
  gesture.startPinchCenterY = center.y;
  gesture.overDeleteZone = false;
  gesture.dragging = false;
  gesture.beforeSnapshot = gesture.beforeSnapshot || currentUndoSnapshot();

  const day = getDay();
  const dateKey = day?.dateKey || layout.dateKey;
  const maxZ = maxCanvasZIndex(dateKey);
  if ((layout.zIndex || 0) < maxZ) layout.zIndex = maxZ + 1;
  const element = elementForItem(itemId, itemType);
  element?.classList.remove("is-dragging", "is-over-delete");
  element?.classList.add("is-selected", "is-gesturing");
  applyInteractiveStyle(element, layout, itemType);

  return true;
}

function startItemGesture(event, mode, itemId, itemType = "photo") {
  const layout = getInteractiveLayout(itemId, itemType);
  if (!layout) return;
  if (itemType === "text") syncTextLayoutSize(layout);

  event.preventDefault();
  const gestureElement = event.target.closest(".canvas-item");
  gesture.capturedPointers = [];
  gesture.capturedElement = null;
  capturePointerForGesture(gestureElement, event.pointerId);
  selectItem(itemType, itemId);
  if (itemType === "text") state.activePanel = "text";
  gesture.active = true;
  gesture.mode = mode;
  gesture.itemId = itemId;
  gesture.itemType = itemType;
  gesture.surface = "day";
  gesture.startClientX = event.clientX;
  gesture.startClientY = event.clientY;
  gesture.startX = layout.x;
  gesture.startY = layout.y;
  gesture.startWidth = layout.width;
  gesture.startHeight = layout.height;
  gesture.startFontSize = layout.fontSize || 0;
  gesture.startScale = layout.scale || 1;
  gesture.aspectRatio = itemAspectRatio(layout, itemType);
  gesture.startRotation = layout.rotation || 0;
  gesture.pointerId = event.pointerId;
  gesture.overDeleteZone = false;
  gesture.dragging = false;
  gesture.beforeSnapshot = currentUndoSnapshot();

  const rect = gestureElement?.getBoundingClientRect()
    || elementForItem(itemId, itemType)?.getBoundingClientRect();
  if (rect) {
    gesture.centerX = rect.left + rect.width / 2;
    gesture.centerY = rect.top + rect.height / 2;
    gesture.startAngle = Math.atan2(event.clientY - gesture.centerY, event.clientX - gesture.centerX);
  }

  const day = getDay();
  const maxZ = maxCanvasZIndex(day?.dateKey || layout.dateKey);
  if ((layout.zIndex || 0) < maxZ) layout.zIndex = maxZ + 1;
  const element = elementForItem(itemId, itemType);
  document.querySelectorAll(".canvas-item.is-selected").forEach((photoElement) => {
    photoElement.classList.remove("is-selected");
  });
  element?.classList.add("is-selected");
  element?.classList.add("is-gesturing");
  applyInteractiveStyle(element, layout, itemType);
  if (mode === "drag") {
    debugInteraction("start drag elementId", { elementId: itemId, itemType });
    setDeleteZoneVisible(false);
  } else {
    setDeleteZoneVisible(false);
  }
}

function startElementDrag(event, itemId, itemType = "photo") {
  startItemGesture(event, "drag", itemId, itemType);
}

function updateGesture(event) {
  const pointer = activePointers.get(event.pointerId);
  if (pointer) {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
  }

  if (!gesture.active) return;

  const layout = getInteractiveLayout(gesture.itemId, gesture.itemType);
  const element = elementForItem(gesture.itemId, gesture.itemType);
  if (!layout || !element) return;

  if (gesture.mode === "pinch") {
    const pointers = activePointersForItem(gesture.itemId, gesture.itemType);
    if (pointers.length < 2) return;

    const distance = Math.max(1, distanceBetween(pointers[0], pointers[1]));
    const angle = angleBetween(pointers[0], pointers[1]);
    const center = centerBetween(pointers[0], pointers[1]);
    const scaleRatio = distance / gesture.startPinchDistance;
    const scaleBounds = scaleBoundsForItem(gesture.itemType);
    const angleDelta = normalizeAngleDelta((angle - gesture.startPinchAngle) * 180 / Math.PI);
    layout.scale = clamp(gesture.startScale * scaleRatio, scaleBounds.min, scaleBounds.max);
    layout.rotation = Math.round((gesture.startRotation + angleDelta) * 10) / 10;
    const freeBounds = freeMoveBoundsForLayout(layout, gesture.itemType, surfaceDimensions(gesture.surface));
    layout.x = clamp(gesture.startX + center.x - gesture.startPinchCenterX, freeBounds.minX, freeBounds.maxX);
    layout.y = clamp(gesture.startY + center.y - gesture.startPinchCenterY, freeBounds.minY, freeBounds.maxY);
    applyInteractiveStyle(element, layout, gesture.itemType);
    return;
  }

  const dx = event.clientX - gesture.startClientX;
  const dy = event.clientY - gesture.startClientY;
  const dimensions = surfaceDimensions(gesture.surface);

  if (gesture.mode === "drag") {
    const freeBounds = freeMoveBoundsForLayout(layout, gesture.itemType, dimensions);
    layout.x = clamp(gesture.startX + dx, freeBounds.minX, freeBounds.maxX);
    layout.y = clamp(gesture.startY + dy, freeBounds.minY, freeBounds.maxY);
    if (Math.hypot(dx, dy) > 3) {
      gesture.dragging = true;
      element.classList.add("is-dragging");
      updateDragDeleteFeedback(event);
    } else {
      setDeleteZoneVisible(false);
    }
  }

  if (gesture.mode === "resize") {
    const projectedDelta = Math.max(dx, dy * gesture.aspectRatio);
    const base = Math.max(gesture.startWidth, gesture.startHeight, 1);
    const scaleBounds = scaleBoundsForItem(gesture.itemType);
    layout.scale = clamp(gesture.startScale * (1 + projectedDelta / base), scaleBounds.min, scaleBounds.max);
    const freeBounds = freeMoveBoundsForLayout(layout, gesture.itemType, dimensions);
    layout.x = clamp(layout.x, freeBounds.minX, freeBounds.maxX);
    layout.y = clamp(layout.y, freeBounds.minY, freeBounds.maxY);
  }

  if (gesture.mode === "rotate") {
    const angle = Math.atan2(event.clientY - gesture.centerY, event.clientX - gesture.centerX);
    const delta = (angle - gesture.startAngle) * 180 / Math.PI;
    layout.rotation = Math.round((gesture.startRotation + delta) * 10) / 10;
  }

  applyInteractiveStyle(element, layout, gesture.itemType);
}

function moveElementDrag(event) {
  updateGesture(event);
}

async function endGesture(event) {
  const pointerId = event?.pointerId;
  const pointer = activePointers.get(pointerId);

  if (!gesture.active) {
    if (pointer) activePointers.delete(pointerId);
    return;
  }

  const itemId = gesture.itemId;
  const itemType = gesture.itemType;
  const mode = gesture.mode;
  const shouldDelete = mode === "drag" && gesture.dragging && (
    gesture.overDeleteZone || (event ? isPointerInDeleteZone(event.clientY) : false)
  );
  const element = elementForItem(itemId, itemType);
  const capturedPointers = gesture.capturedPointers.slice();

  setDeleteZoneVisible(false);
  element?.classList.remove("is-dragging", "is-over-delete", "is-gesturing");
  capturedPointers.forEach(({ element: capturedElement, pointerId: capturedPointerId }) => {
    if (capturedElement?.hasPointerCapture?.(capturedPointerId)) {
      try {
        capturedElement.releasePointerCapture(capturedPointerId);
      } catch {
        // Ignore release errors from browsers that already dropped capture.
      }
    }
    activePointers.delete(capturedPointerId);
  });

  gesture.active = false;
  gesture.mode = "";
  gesture.itemId = "";
  gesture.itemType = "";
  gesture.startFontSize = 0;
  gesture.startScale = 1;
  const beforeSnapshot = gesture.beforeSnapshot;
  gesture.beforeSnapshot = null;
  gesture.pointerId = null;
  gesture.capturedElement = null;
  gesture.capturedPointers = [];
  gesture.overDeleteZone = false;
  gesture.dragging = false;
  gesture.surface = "";

  if (shouldDelete && itemId) {
    await deleteInteractiveItem(itemId, itemType, beforeSnapshot);
    if (pointer) activePointers.delete(pointerId);
    debugInteraction("end drag", { elementId: itemId, itemType, deleted: true });
    return;
  }

  if (itemId) {
    if (itemType !== "text") clampElementToSafeBounds(itemId, itemType);
    applyInteractiveStyle(elementForItem(itemId, itemType), getInteractiveLayout(itemId, itemType), itemType);
    await persistInteractiveLayout(itemId, itemType);
    commitUndoSnapshot(beforeSnapshot);
  }
  if (pointer) activePointers.delete(pointerId);
  if (mode === "drag") debugInteraction("end drag", { elementId: itemId, itemType, deleted: false });
  if (itemId && itemType === "text") {
    const textElement = getCanvasElement(itemId);
    if (textElement?.type === "text") {
      beginTextEditorSession(textElement, { beforeSnapshot: currentUndoSnapshot() });
      render();
    }
  }
}

function endElementDrag(event) {
  endGesture(event);
}

function preventViewportGesture(event) {
  if (event.cancelable) event.preventDefault();
}

function clearCustomStickerPress() {
  if (customStickerPress.timer) window.clearTimeout(customStickerPress.timer);
  customStickerPress.timer = null;
  customStickerPress.pointerId = null;
}

function startCustomStickerPress(event) {
  if (!state.stickerImagePickerOpen) return;
  if (!event.target.closest("[data-custom-sticker-thumb]")) return;

  clearCustomStickerPress();
  customStickerPress.pointerId = event.pointerId;
  customStickerPress.startX = event.clientX;
  customStickerPress.startY = event.clientY;
  customStickerPress.timer = window.setTimeout(() => {
    customStickerPress.timer = null;
    state.customStickerManageMode = true;
    render();
  }, 480);
}

function moveCustomStickerPress(event) {
  if (!customStickerPress.timer || event.pointerId !== customStickerPress.pointerId) return;
  const dx = event.clientX - customStickerPress.startX;
  const dy = event.clientY - customStickerPress.startY;
  if (Math.hypot(dx, dy) > 10) clearCustomStickerPress();
}

document.addEventListener("pointerdown", (event) => {
  if (isPageTransitioning) return;
  if (stopDaybookNavPointerEvent(event)) return;
  if (startDayPress(event)) return;
  startCustomStickerPress(event);

  if (event.target.closest("[data-sticker-sheet-handle]")) {
    startStickerSheetDrag(event);
    return;
  }

  if (event.target.closest(".text-editor-panel, .sticker-image-picker, .floating-toolbox, .sticker-sheet, .sticker-backdrop, .canvas-action-bar, .settings-sheet, .settings-backdrop, .settings-button, .header-icon-action")) return;

  const deleteButton = event.target.closest(".delete-photo");
  if (deleteButton) {
    const owner = deleteButton.closest(".canvas-item");
    const itemId = owner?.dataset.itemId;
    const itemType = owner?.dataset.itemType;
    if (itemType === "photo" && itemId) deleteSelectedPhoto(itemId);
    if ((itemType === "text" || itemType === "emoji" || itemType === "sticker") && itemId) deleteSelectedElement(itemId);
    return;
  }

  const resizeHandle = event.target.closest(".resize-handle");
  if (resizeHandle) {
    const owner = resizeHandle.closest(".canvas-item");
    const itemId = owner?.dataset.itemId;
    const itemType = owner?.dataset.itemType || "photo";
    if (itemId) {
      activePointers.set(event.pointerId, { itemId, itemType, x: event.clientX, y: event.clientY });
      startItemGesture(event, "resize", itemId, itemType);
    }
    return;
  }

  const rotateHandle = event.target.closest(".rotate-handle");
  if (rotateHandle) {
    const owner = rotateHandle.closest(".canvas-item");
    const itemId = owner?.dataset.itemId;
    const itemType = owner?.dataset.itemType || "photo";
    if (itemId) {
      activePointers.set(event.pointerId, { itemId, itemType, x: event.clientX, y: event.clientY });
      startItemGesture(event, "rotate", itemId, itemType);
    }
    return;
  }

  const canvasItem = event.target.closest(".canvas-item");
  if (canvasItem) {
    const itemId = canvasItem.dataset.itemId;
    const itemType = canvasItem.dataset.itemType || "photo";
    activePointers.set(event.pointerId, { itemId, itemType, x: event.clientX, y: event.clientY });
    if (activePointersForItem(itemId, itemType).length >= 2) {
      startPinchGesture(event, itemId, itemType);
      return;
    }
    startElementDrag(event, itemId, itemType);
    return;
  }

  if (event.target.classList.contains("free-canvas") && state.selectedPhotoId) {
    clearSelection();
    state.activePanel = "";
    render();
  }
});

window.addEventListener("pointermove", moveElementDrag);
window.addEventListener("pointerup", endElementDrag);
window.addEventListener("pointercancel", endElementDrag);
window.addEventListener("pointermove", moveStickerSheetDrag);
window.addEventListener("pointerup", endStickerSheetDrag);
window.addEventListener("pointercancel", endStickerSheetDrag);
window.addEventListener("pointermove", moveDayPress);
window.addEventListener("pointerup", endDayPress);
window.addEventListener("pointercancel", cancelDayPress);
window.addEventListener("pointermove", moveCustomStickerPress);
window.addEventListener("pointerup", clearCustomStickerPress);
window.addEventListener("pointercancel", clearCustomStickerPress);
window.addEventListener("pointerleave", cancelDayPress);
window.addEventListener("resize", scheduleCanvasSafetyRepair);
document.addEventListener("gesturestart", preventViewportGesture, { passive: false });
document.addEventListener("gesturechange", preventViewportGesture, { passive: false });
document.addEventListener("gestureend", preventViewportGesture, { passive: false });
document.addEventListener("pointerup", stopDaybookNavPointerEvent);
document.addEventListener("pointercancel", stopDaybookNavPointerEvent);
document.addEventListener("touchcancel", stopDaybookNavPointerEvent);

document.addEventListener("click", async (event) => {
  if (isPageTransitioning) return;

  const dayTarget = event.target.closest("[data-day]");
  const actionTarget = event.target.closest("[data-action]");

  if (daybookNavButtonTarget(event)) {
    event.stopPropagation();
    clearDayPress();
  }

  if (dayTarget) {
    if (event.detail === 0) openDay(dayTarget.dataset.day);
    return;
  }

  if (!actionTarget) return;

  const action = actionTarget.dataset.action;
  if (action === "open-daybook") {
    window.setTimeout(() => {
      navigateToPage("daybook", "forward");
    }, 70);
    return;
  }
  if (action === "add-first-photo") {
    event.stopPropagation();
    openPhotoPicker(null, { source: "empty-home" });
    return;
  }
  if (action === "home") {
    navigateToPage("home", "back");
    return;
  }
  if (action === "daybook") {
    navigateToPage("daybook", "back");
    return;
  }
  if (action === "edit-note") {
    editNote();
    return;
  }
  if (action === "open-settings") {
    event.stopPropagation();
    state.settingsSheetOpen = true;
    render();
    return;
  }
  if (action === "close-settings") {
    event.stopPropagation();
    state.settingsSheetOpen = false;
    render();
    return;
  }
  if (action === "export-backup") {
    event.stopPropagation();
    exportBackup();
    return;
  }
  if (action === "restore-backup") {
    event.stopPropagation();
    state.settingsSheetOpen = false;
    render();
    openBackupPicker();
    return;
  }
  if (action === "export-day") {
    event.stopPropagation();
    exportCurrentDayImage();
    return;
  }
  if (action === "undo") {
    event.stopPropagation();
    undoLastChange();
    return;
  }
  if (action === "add-text") {
    if (state.selectedItemType === "text" && state.selectedPhotoId) {
      openTextComposer(state.selectedPhotoId);
    } else {
      addTextElement();
    }
    return;
  }
  if (action === "complete-text-compose") {
    completeTextComposer();
    return;
  }
  if (action === "open-sticker-panel") {
    if (state.activePanel === "sticker") {
      state.activePanel = "";
    } else {
      state.activePanel = "sticker";
      state.stickerSheetState = "collapsed";
      stickerSheetDrag.ignoreNextToggle = false;
    }
    render();
    return;
  }
  if (action === "toggle-sticker-sheet") {
    if (stickerSheetDrag.ignoreNextToggle) {
      stickerSheetDrag.ignoreNextToggle = false;
      return;
    }
    state.stickerSheetState = state.stickerSheetState === "expanded" ? "collapsed" : "expanded";
    render();
    return;
  }
  if (action === "open-sticker-image-picker") {
    state.activePanel = "";
    state.stickerImagePickerOpen = true;
    state.customStickerManageMode = false;
    state.stickerSheetState = "collapsed";
    stickerSheetDrag.ignoreNextToggle = false;
    render();
    return;
  }
  if (action === "close-sticker-image-picker") {
    state.stickerImagePickerOpen = false;
    state.customStickerManageMode = false;
    render();
    return;
  }
  if (action === "toggle-custom-sticker-management") {
    state.customStickerManageMode = !state.customStickerManageMode;
    render();
    return;
  }
  if (action === "delete-custom-sticker") {
    const stickerId = actionTarget.dataset.stickerId;
    if (stickerId) await deleteCustomSticker(stickerId);
    if (!state.customStickers.length) state.customStickerManageMode = false;
    render();
    return;
  }
  if (action === "choose-sticker-image") {
    openCustomStickerPicker();
    return;
  }
  if (action === "open-custom-sticker-picker") {
    state.activePanel = "";
    state.stickerSheetState = "collapsed";
    openCustomStickerPicker();
    render();
    return;
  }
  if (action === "add-sticker") {
    if (state.customStickerManageMode && actionTarget.closest(".sticker-image-picker")) return;
    const customSticker = actionTarget.dataset.stickerType === "image"
      ? state.customStickers.find((sticker) => sticker.id === actionTarget.dataset.stickerId)
      : null;
    await addStickerElement({
      stickerType: actionTarget.dataset.stickerType || "emoji",
      content: actionTarget.dataset.stickerContent || "✨",
      color: actionTarget.dataset.stickerColor || "#222222",
      imageDataUrl: customSticker?.imageDataUrl || "",
      src: customSticker?.src || customSticker?.imageDataUrl || "",
      aspectRatio: customSticker?.aspectRatio || 1
    });
    return;
  }
  if (action === "edit-text-element") {
    const itemId = actionTarget.closest(".canvas-item")?.dataset.itemId;
    if (itemId) editTextElement(itemId);
    return;
  }
  if (action === "edit-selected-text") {
    const element = selectedTextElement();
    if (element) editTextElement(element.id);
    return;
  }
  if (action === "delete-photo" || action === "delete-element") return;
  if (action === "text-font-size") {
    const fontSize = Number(actionTarget.dataset.fontSize);
    if (fontSize) {
      await applyTextComposerPatch({ fontSize }, { renderControls: true });
    }
    return;
  }
  if (action === "text-style") {
    const style = textStyle(actionTarget.dataset.style);
    if (style) updateSelectedTextElement((element) => Object.assign(element, style));
    return;
  }
  if (action === "text-color") {
    const color = actionTarget.dataset.color;
    if (color) {
      await applyTextComposerPatch({ color }, { renderControls: true });
    }
    return;
  }
  if (action === "text-background") {
    const backgroundStyle = normalizedTextBackgroundStyle(actionTarget.dataset.backgroundStyle);
    await applyTextComposerPatch({ backgroundStyle }, { renderControls: true });
    return;
  }
  if (action === "text-align") {
    const alignments = ["left", "center", "right"];
    updateSelectedTextElement((element) => {
      const index = alignments.indexOf(element.textAlign);
      element.textAlign = alignments[(index + 1) % alignments.length];
    });
    return;
  }
  if (action === "text-size-down") {
    updateSelectedTextElement((element) => {
      element.fontSize = clamp((element.fontSize || 24) - 2, 12, 96);
      element.height = Math.max(34, element.fontSize * 1.6);
    });
    return;
  }
  if (action === "text-size-up") {
    updateSelectedTextElement((element) => {
      element.fontSize = clamp((element.fontSize || 24) + 2, 12, 96);
      element.height = Math.max(34, element.fontSize * 1.6);
    });
    return;
  }
  if (action === "close-panel") {
    state.activePanel = "";
    state.stickerImagePickerOpen = false;
    state.customStickerManageMode = false;
    stickerSheetDrag.ignoreNextToggle = false;
    render();
    return;
  }
  if (action === "add-photo") {
    event.stopPropagation();
    openPhotoPicker();
    return;
  }
  if (action === "paste-clipboard") {
    event.stopPropagation();
    pasteFromClipboard();
    return;
  }

  render();
});

document.addEventListener("dblclick", (event) => {
  const textItem = event.target.closest('[data-item-type="text"]');
  if (!textItem) return;
  editTextElement(textItem.dataset.itemId);
});

document.addEventListener("input", (event) => {
  const composer = event.target.closest("[data-text-composer]");
  if (!composer) return;
  applyTextComposerPatch({ value: composer.value });
});

document.querySelector("#photoInput").addEventListener("change", handlePhotoSelection);
document.querySelector("#stickerInput").addEventListener("change", handleCustomStickerSelection);
document.querySelector("#backupInput").addEventListener("change", handleBackupRestoreSelection);

async function initApp() {
  try {
    state.db = await openPhotoDatabase();
  } catch {
    state.storageMode = "localStorage";
  }

  state.userPhotos = await loadUserPhotos();
  state.canvasElements = await loadCanvasElements();
  state.customStickers = await loadCustomStickers();
  await ensureLayoutsForPhotos();
  await ensureLayoutsForCanvasElements();
  render();
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;

  const hadController = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (refreshing || !hadController) return;
    refreshing = true;
    window.location.reload();
  });

  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js")
      .then((registration) => {
        if (registration.waiting) {
          registration.waiting.postMessage({ type: "SKIP_WAITING" });
        }

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state !== "installed") return;

            if (navigator.serviceWorker.controller) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        registration.update();
      })
      .catch((error) => {
        console.warn("Moments Journal service worker registration failed.", error);
      });
  });
}

initApp();
registerServiceWorker();
