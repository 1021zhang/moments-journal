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
  stickerSheetState: "half",
  settingsSheetOpen: false,
  isExportingBackup: false,
  isExportingDay: false,
  toast: "",
  toastTimer: null,
  addMenuOpen: false,
  pendingInsertPoint: null,
  nativePastePoint: null,
  textComposer: {
    active: false,
    editingId: "",
    value: ""
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
  overDeleteZone: false,
  dragging: false,
  centerX: 0,
  centerY: 0,
  beforeSnapshot: null
};

const activePointers = new Map();
let isPageTransitioning = false;
const dayPress = {
  element: null,
  dayId: "",
  pointerId: null
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
    return { date: "Today", detail: dateText };
  }

  return {
    date: dateKey === dateKeyFromDate(yesterday) ? "Yesterday" : dateText,
    detail: dateKey === dateKeyFromDate(yesterday) ? dateText : weekday
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

function measureTextLayout(content, fontSize = 34) {
  const lines = String(content || "Text").split("\n");
  const longestLine = lines.reduce((longest, line) => Math.max(longest, Array.from(line || " ").length), 1);
  const width = clamp(Math.ceil(longestLine * fontSize * 0.62), 44, 300);
  const height = Math.ceil(lines.length * fontSize * 1.18);
  return { width, height };
}

function defaultTextElement(dateKey, content = "Text") {
  const fontSize = 34;
  const size = measureTextLayout(content, fontSize);
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
    fontWeight: "600",
    color: "#222222",
    textAlign: "center",
    letterSpacing: "0"
  };
}

function positionTextElement(element, point) {
  if (!point) return element;

  element.x = clamp(Math.round(point.x - element.width / 2), 0, canvasWidth - element.width);
  element.y = clamp(Math.round(point.y - element.height / 2), 0, canvasHeight - element.height);
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
  const imageWidth = 112;
  const imageHeight = imageWidth / (sticker.aspectRatio || 1);

  return {
    id: uid("sticker"),
    type: "sticker",
    stickerType: sticker.stickerType,
    content: sticker.content,
    imageDataUrl: sticker.imageDataUrl || "",
    dateKey,
    x: isTextSticker ? 108 : isImageSticker ? 132 : 154,
    y: isTextSticker ? 188 : isImageSticker ? 168 : 176,
    width: isTextSticker ? 142 : isImageSticker ? imageWidth : 70,
    height: isTextSticker ? 58 : isImageSticker ? imageHeight : 70,
    rotation: 0,
    scale: 1,
    zIndex: maxCanvasZIndex(dateKey) + 1,
    fontSize: isTextSticker ? 22 : 48,
    color: sticker.color || "#222222",
    aspectRatio: sticker.aspectRatio || (isImageSticker ? imageWidth / imageHeight : 1)
  };
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
      const fontSize = element.fontSize || 34;
      const size = measureTextLayout(element.content, fontSize);
      if (typeof element.width !== "number") {
        element.width = size.width;
        changed = true;
      }
      if (typeof element.height !== "number") {
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

function dateTitle(day) {
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
      <path d="M12 8.6a3.4 3.4 0 1 0 0 6.8 3.4 3.4 0 0 0 0-6.8Z" />
      <path d="M19.1 13.4c.1-.5.1-.9 0-1.4l1.4-1.1-1.7-2.9-1.7.7c-.4-.3-.8-.5-1.3-.7L15.6 6h-3.2l-.3 2c-.5.2-.9.4-1.3.7L9.1 8l-1.6 2.9L8.9 12a4.9 4.9 0 0 0 0 1.4l-1.4 1.1 1.6 2.9 1.7-.7c.4.3.8.5 1.3.7l.3 2h3.2l.3-2c.5-.2.9-.4 1.3-.7l1.7.7 1.7-2.9-1.5-1.1Z" />
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

function settingsButton() {
  return `
    <button class="settings-button" type="button" data-action="open-settings" aria-label="Settings" title="Settings">
      ${settingsIcon()}
    </button>
  `;
}

function settingsSheet() {
  if (!state.settingsSheetOpen) return "";

  return `
    <button class="settings-backdrop" type="button" data-action="close-settings" aria-label="Close settings"></button>
    <section class="settings-sheet" aria-label="Settings">
      <div class="settings-sheet-handle" aria-hidden="true"></div>
      <button class="settings-option" type="button" data-action="export-backup" ${state.isExportingBackup ? "disabled" : ""}>Export backup</button>
      <button class="settings-option" type="button" data-action="restore-backup">Restore backup</button>
      <button class="settings-close-button" type="button" data-action="close-settings" aria-label="Close settings">Cancel</button>
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
    <main class="memory-home memory-home-empty" aria-label="Memory Stack">
      <h1 class="sr-only">Memory Stack</h1>
      ${settingsButton()}

      <section class="memory-empty-state">
        <p>Add your first memory.</p>
      </section>
      ${settingsSheet()}
      ${toastMarkup()}
    </main>
  `;
}

function renderHome() {
  const photos = stackPhotos();
  if (!photos.length) return renderEmptyHome();

  return `
    <main class="memory-home" aria-label="Memory Stack">
      <h1 class="sr-only">Memory Stack</h1>
      ${settingsButton()}

      <button class="memory-stack-area" type="button" data-action="open-daybook" aria-label="Open daybook">
        <span class="memory-stack-stage">
          ${photos.map((photo, index) => memoryStackPhoto(photo, index, photos.length)).join("")}
        </span>
      </button>

      <button class="memory-caption" type="button" data-action="open-daybook">A lot happened recently.</button>
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
        <button class="round-button daybook-add-button" type="button" data-action="add-photo" aria-label="Add photos">+</button>
      </header>

      <section class="empty-daybook">
        <p>Add photos to start your daybook.</p>
        <button class="home-add-button" type="button" data-action="add-photo" aria-label="Add photos">+</button>
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
        <button class="round-button daybook-add-button" type="button" data-action="add-photo" aria-label="Add photos">+</button>
      </header>

      <div class="day-feed">
        ${days.map((day) => `
          <button class="day-section" type="button" data-day="${day.id}" aria-label="Open ${day.date}">
            ${dateTitle(day)}
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
      <button class="delete-photo" type="button" data-action="delete-photo" aria-label="Delete photo">×</button>
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
    baseStyle.push(
      `--font-size:${element.fontSize}px`,
      `--font-family:${escapeHtml(element.fontFamily)}`,
      `--font-weight:${escapeHtml(element.fontWeight)}`,
      `--font-color:${escapeHtml(element.color)}`,
      `--text-align:${escapeHtml(element.textAlign)}`,
      `--letter-spacing:${escapeHtml(element.letterSpacing || "0")}`
    );

    return `
      <div class="canvas-item canvas-text-element ${selected}" data-item-type="text" data-item-id="${element.id}" style="${baseStyle.join(";")}">${escapeHtml(element.content)}</div>
    `;
  }

  const stickerType = element.type === "emoji" ? "emoji" : element.stickerType;
  const stickerClass = stickerType === "text" ? "text-sticker" : stickerType === "image" ? "image-sticker" : "emoji-sticker";
  baseStyle.push(
    `--font-size:${element.fontSize}px`,
    `--sticker-color:${escapeHtml(element.color || "#222222")}`
  );

  return `
    <div class="canvas-item canvas-sticker ${stickerClass} ${selected}" data-item-type="${element.type}" data-item-id="${element.id}" style="${baseStyle.join(";")}">
      ${stickerType === "image"
        ? `<img src="${element.imageDataUrl}" alt="" draggable="false" />`
        : `<span>${escapeHtml(element.content)}</span>`}
      <button class="delete-photo" type="button" data-action="delete-element" aria-label="Delete sticker">×</button>
      <span class="rotate-handle" aria-hidden="true">↻</span>
      <span class="resize-handle" aria-hidden="true"></span>
    </div>
  `;
}

function stickerLibrary() {
  const customStickers = state.customStickers
    .slice()
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((sticker) => ({ ...sticker, stickerType: "image" }));
  const emojiStickers = ["✨", "❤️", "😊", "☕️", "🌿", "🍀", "📍", "🎀", "🐶", "🍰", "🌙", "📷", "🧸", "📝", "🔥", "💫", "🦋", "🌸"]
    .map((content) => ({ stickerType: "emoji", content, color: "#222222" }));
  const colors = ["#d94a4a", "#4f6f52", "#6f6f8f", "#222222", "#b47f48", "#7a5c9e"];
  const textStickers = ["LOVE", "COOL", "WOW", "OMG", "SUMMER", "LUOLUO", "GOOD DAY", "HAPPY", "YUMMY", "FUN", "TODAY", "MEMORY"]
    .map((content, index) => ({ stickerType: "text", content, color: colors[index % colors.length] }));

  return [...customStickers, ...emojiStickers, ...textStickers];
}

function stickerSheet() {
  if (state.activePanel !== "sticker") return "";
  const stickers = stickerLibrary();

  return `
    <button class="sticker-backdrop" type="button" data-action="close-panel" aria-label="Close stickers"></button>
    <section class="sticker-sheet ${state.stickerSheetState}" aria-label="Sticker library">
      <header class="sticker-sheet-header">
        <button class="sheet-grabber" type="button" data-action="toggle-sticker-sheet" aria-label="Expand stickers"></button>
        <h2>Stickers</h2>
        <span aria-hidden="true"></span>
      </header>
      <div class="sticker-grid">
        ${stickers.map((sticker) => `
          <button
            class="sticker-choice ${sticker.stickerType === "text" ? "text-sticker-choice" : sticker.stickerType === "image" ? "image-sticker-choice" : "emoji-sticker-choice"}"
            type="button"
            data-action="add-sticker"
            data-sticker-type="${sticker.stickerType}"
            data-sticker-id="${sticker.id || ""}"
            data-sticker-content="${escapeHtml(sticker.content || "")}"
            data-sticker-color="${sticker.color || "#222222"}"
            style="--sticker-color:${sticker.color || "#222222"}"
          >
            ${sticker.stickerType === "image"
              ? `<img src="${sticker.imageDataUrl}" alt="" draggable="false" />`
              : escapeHtml(sticker.content)}
          </button>
        `).join("")}
      </div>
    </section>
  `;
}

function textComposerOverlay() {
  if (!state.textComposer.active) return "";

  return `
    <div class="text-composer-overlay" aria-label="Text input mode">
      <button class="text-composer-done" type="button" data-action="complete-text-compose">完成</button>
      <textarea
        id="textComposerInput"
        class="text-composer-input"
        data-text-composer
        placeholder="Text"
        rows="2"
      >${escapeHtml(state.textComposer.value)}</textarea>
    </div>
  `;
}

function nativePasteTarget() {
  return `
    <div
      class="native-paste-target"
      contenteditable="plaintext-only"
      inputmode="none"
      spellcheck="false"
      autocapitalize="off"
      autocomplete="off"
      role="textbox"
      aria-label="Paste into page"
      data-native-paste-target
    ></div>
  `;
}

function addMenu() {
  if (!state.addMenuOpen) return "";

  return `
    <button class="add-menu-backdrop" type="button" data-action="close-add-menu" aria-label="Close add menu"></button>
    <div class="add-menu-sheet" role="menu" aria-label="Add menu">
      <button type="button" data-action="add-menu-photo" role="menuitem">Add photo</button>
      <button type="button" data-action="close-add-menu" role="menuitem">Cancel</button>
    </div>
  `;
}

function renderSingleDay() {
  const day = getDay();
  if (!day) return renderEmptyDaybook();

  const note = noteFor(day);
  const safeNote = escapeHtml(note);
  const noteDialogTitle = note.trim() ? "Edit note" : "Add note";
  const dayElements = elementsForDate(day.dateKey);
  const canUndo = undoStackForDate(day.dateKey).length > 0;

  return `
    <main class="phone-screen single-day-view" aria-label="Single Day Page">
      <header class="day-page-header">
        <div class="header-side header-left">
          <button class="header-action back-button" type="button" data-action="daybook">Back</button>
        </div>
        <div class="header-center" aria-hidden="true"></div>
        <div class="header-side header-right">
          <button class="header-icon-action undo-button" type="button" data-action="undo" aria-label="Undo" ${canUndo ? "" : "disabled"}>
            ${undoIcon()}
          </button>
          <button class="header-icon-action export-day-button" type="button" data-action="export-day" aria-label="Export day" ${state.isExportingDay ? "disabled" : ""}>
            ${exportIcon()}
          </button>
        </div>
      </header>

      <header class="single-header">
        ${dateTitle(day)}
        ${note ? `<p class="single-note">${safeNote}</p>` : ""}
      </header>

      <section class="free-canvas" aria-label="Free layout canvas">
        ${nativePasteTarget()}
        ${day.photos.map(freeCanvasPhoto).join("")}
        ${dayElements.map(canvasElement).join("")}
        <div class="floating-toolbox" aria-label="Canvas tools">
          <button type="button" data-action="add-text" aria-label="Add text to page" title="Add text to page"><span class="toolbox-text-mark" aria-hidden="true">Aa</span></button>
          <button type="button" data-action="open-sticker-panel" aria-label="Stickers" title="Stickers">
            <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
              <path d="M7.2 5.5h8.2c1.7 0 3.1 1.4 3.1 3.1v5.1c0 2.7-2.1 4.8-4.8 4.8H7.2v-13Z" />
              <path d="M13.7 18.5c0-2.7 2.1-4.8 4.8-4.8" />
              <path d="M9.9 10.1h.1" />
              <path d="M14.1 10.1h.1" />
              <path d="M10.2 13.4c.7.8 2.9.8 3.6 0" />
            </svg>
          </button>
          <button type="button" data-action="edit-note" aria-label="Daily note" title="Daily note">${noteIcon()}</button>
        </div>
        <button class="canvas-add-button" type="button" data-action="open-add-menu" aria-label="Add">+</button>
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
      ${textComposerOverlay()}
      ${addMenu()}
      ${toastMarkup()}
    </main>

    <dialog class="note-dialog" id="noteDialog" aria-labelledby="noteDialogTitle">
      <form method="dialog">
        <h2 id="noteDialogTitle">${noteDialogTitle}</h2>
        <p class="note-dialog-description">Shown below this day’s photos.</p>
        <label class="sr-only" for="noteInput">Note</label>
        <textarea id="noteInput">${safeNote}</textarea>
        <div class="dialog-actions">
          <button class="ghost-button" value="cancel" type="submit">Cancel</button>
          <button class="add-button" value="save" type="submit">Save</button>
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
  bindNativePasteTarget();
  document.body.classList.toggle("settings-open", state.settingsSheetOpen);
  resetHorizontalScroll();
}

function closeCanvasMenus() {
  state.addMenuOpen = false;
}

function closeCanvasMenusAndResetPoint() {
  closeCanvasMenus();
  state.pendingInsertPoint = null;
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

function openAddMenu() {
  state.addMenuOpen = true;
  state.activePanel = "";
  state.pendingInsertPoint = visibleCanvasCenterPoint();
  render();
}

function preparePageState(targetView, options = {}) {
  clearSelection();
  activePointers.clear();
  setDeleteZoneVisible(false);
  state.activePanel = "";
  state.settingsSheetOpen = false;
  closeCanvasMenus();
  state.pendingInsertPoint = null;
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

function openPhotoPicker(point = null) {
  const day = getDay();
  state.pendingImportDateKey = state.view === "single" && day?.dateKey ? day.dateKey : todayDateKey();
  state.pendingInsertPoint = point;
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
  return records;
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
  if (endOffset < 0) throw new Error("Backup zip is missing its directory.");

  const fileCount = readUint16(bytes, endOffset + 10);
  let directoryOffset = readUint32(bytes, endOffset + 16);
  const files = new Map();

  for (let index = 0; index < fileCount; index += 1) {
    if (readUint32(bytes, directoryOffset) !== 0x02014b50) throw new Error("Backup zip directory is invalid.");

    const method = readUint16(bytes, directoryOffset + 10);
    const size = readUint32(bytes, directoryOffset + 24);
    const nameLength = readUint16(bytes, directoryOffset + 28);
    const extraLength = readUint16(bytes, directoryOffset + 30);
    const commentLength = readUint16(bytes, directoryOffset + 32);
    const localOffset = readUint32(bytes, directoryOffset + 42);
    const name = decoder.decode(bytes.slice(directoryOffset + 46, directoryOffset + 46 + nameLength));

    if (method !== 0) throw new Error("Compressed backup entries are not supported yet.");
    if (readUint32(bytes, localOffset) !== 0x04034b50) throw new Error("Backup zip file entry is invalid.");

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

    if (!blob) throw new Error("Could not compress image");
    return {
      imageDataUrl: await blobToDataUrl(blob),
      aspectRatio: width / height
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function clipboardImageData(blob) {
  const objectUrl = URL.createObjectURL(blob);

  try {
    const image = await loadImage(objectUrl);
    const maxSide = 1600;
    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const scale = Math.min(1, maxSide / longestSide);
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    if (scale >= 1) {
      return {
        imageDataUrl: await blobToDataUrl(blob),
        aspectRatio: image.naturalWidth / image.naturalHeight,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight
      };
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    context.drawImage(image, 0, 0, width, height);
    const imageDataUrl = blob.type === "image/jpeg"
      ? canvas.toDataURL("image/jpeg", 0.9)
      : canvas.toDataURL("image/png");

    return {
      imageDataUrl,
      aspectRatio: width / height,
      naturalWidth: width,
      naturalHeight: height
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function photoSizeForImage(naturalWidth, naturalHeight) {
  const aspectRatio = naturalWidth / naturalHeight || 1;
  const maxWidth = Math.round(canvasWidth * 0.66);
  const maxHeight = Math.round(canvasHeight * 0.55);
  let width = Math.min(naturalWidth, maxWidth);
  let height = width / aspectRatio;

  if (height > maxHeight) {
    height = Math.min(naturalHeight, maxHeight);
    width = height * aspectRatio;
  }

  return {
    width: Math.max(1, Math.round(width)),
    height: Math.max(1, Math.round(height))
  };
}

async function createPastedText(text, point = visibleCanvasCenterPoint()) {
  const day = getDay();
  const value = String(text || "").replace(/^\s+|\s+$/g, "");
  if (!day || !value) {
    showToast("Nothing to paste");
    return false;
  }

  const undoBefore = snapshotForDate(day.dateKey);
  const element = positionTextElement(defaultTextElement(day.dateKey, value), point);
  await saveCanvasElement(element);
  selectItem("text", element.id);
  commitUndoSnapshot(undoBefore);
  closeCanvasMenus();
  render();
  return true;
}

async function createPastedImage(blob, point = visibleCanvasCenterPoint()) {
  const day = getDay();
  if (!day || !blob) return false;

  const undoBefore = snapshotForDate(day.dateKey);
  const image = await clipboardImageData(blob);
  const size = photoSizeForImage(image.naturalWidth, image.naturalHeight);
  const photo = positionPhotoElement({
    id: uid(),
    imageDataUrl: image.imageDataUrl,
    aspectRatio: image.aspectRatio,
    addedAt: new Date().toISOString(),
    dateKey: day.dateKey,
    label: "",
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    rotation: 0,
    scale: 1,
    zIndex: maxCanvasZIndex(day.dateKey) + 1
  }, point);

  await saveUserPhotos([photo]);
  state.activeDayId = `user-${day.dateKey}`;
  selectItem("photo", photo.id);
  commitUndoSnapshot(undoBefore);
  closeCanvasMenus();
  render();
  return true;
}

function nativePasteTargetElement() {
  return document.querySelector("[data-native-paste-target]");
}

function clearNativeSelection() {
  const selection = window.getSelection?.();
  selection?.removeAllRanges?.();
}

function clearNativePasteTarget(target = nativePasteTargetElement()) {
  if (!target) return;
  target.textContent = "";
  target.innerHTML = "";
}

function resetNativePasteTarget(target = nativePasteTargetElement()) {
  clearNativePasteTarget(target);
  target?.blur?.();
  clearNativeSelection();
}

function focusNativePasteTarget(target) {
  if (!target || document.activeElement === target) return;
  try {
    target.focus({ preventScroll: true });
  } catch {
    target.focus();
  }
}

function imageBlobFromPasteData(data) {
  const items = Array.from(data?.items || []);
  const imageItem = items.find((item) => item.kind === "file" && item.type.startsWith("image/"));
  if (imageItem) return imageItem.getAsFile();

  const files = Array.from(data?.files || []);
  return files.find((file) => file.type.startsWith("image/")) || null;
}

async function createPastedContentFromData(data, point = visibleCanvasCenterPoint()) {
  const imageBlob = imageBlobFromPasteData(data);
  if (imageBlob) return createPastedImage(imageBlob, point);

  const text = data?.getData?.("text/plain") || "";
  if (text) return createPastedText(text, point);

  showToast("Nothing to paste");
  return false;
}

async function handlePhotoSelection(event) {
  const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
  if (!files.length) {
    state.pendingInsertPoint = null;
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
    window.alert("No photos could be imported.");
    return;
  }

  try {
    await saveUserPhotos(imported);
  } catch {
    state.pendingInsertPoint = null;
    window.alert("Photos were compressed, but could not be saved locally.");
    return;
  }

  if (state.view === "single") {
    state.activeDayId = `user-${dateKey}`;
    selectItem("photo", imported[0].id);
    commitUndoSnapshot(undoBefore);
  }

  state.pendingInsertPoint = null;
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

  state.pendingInsertPoint = point;
  openTextComposer();
}

function focusTextComposer() {
  window.setTimeout(() => {
    const input = document.querySelector("#textComposerInput");
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, 0);
}

function openTextComposer(editingId = "") {
  const element = editingId ? getCanvasElement(editingId) : null;
  state.activePanel = "";
  state.textComposer = {
    active: true,
    editingId: element?.type === "text" ? element.id : "",
    value: element?.type === "text" ? element.content : ""
  };
  if (element?.type === "text") {
    selectItem("text", element.id);
  } else {
    clearSelection();
  }
  render();
  focusTextComposer();
}

async function completeTextComposer() {
  const value = state.textComposer.value.trim();
  const editingId = state.textComposer.editingId;
  state.textComposer = { active: false, editingId: "", value: "" };

  if (!value) {
    state.pendingInsertPoint = null;
    render();
    return;
  }

  const editingElement = editingId ? getCanvasElement(editingId) : null;
  if (editingElement?.type === "text") {
    const undoBefore = currentUndoSnapshot();
    const size = measureTextLayout(value, editingElement.fontSize || 34);
    editingElement.content = value;
    editingElement.width = size.width;
    editingElement.height = size.height;
    await saveCanvasElement(editingElement);
    selectItem("text", editingElement.id);
    commitUndoSnapshot(undoBefore);
    render();
    return;
  }

  const day = getDay();
  if (!day) {
    render();
    return;
  }

  const element = positionTextElement(defaultTextElement(day.dateKey, value), state.pendingInsertPoint);
  const undoBefore = snapshotForDate(day.dateKey);
  await saveCanvasElement(element);
  selectItem("text", element.id);
  state.pendingInsertPoint = null;
  commitUndoSnapshot(undoBefore);
  render();
}

async function addStickerElement(sticker) {
  const day = getDay();
  if (!day) return;

  const element = defaultStickerElement(day.dateKey, sticker);
  const undoBefore = snapshotForDate(day.dateKey);
  debugInteraction("add sticker", {
    stickerType: sticker.stickerType,
    content: sticker.content || "",
    elementId: element.id
  });
  state.activePanel = "";
  state.stickerSheetState = "half";
  render();
  await saveCanvasElement(element);
  selectItem("sticker", element.id);
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
      stickerType: "image",
      imageDataUrl: compressed.imageDataUrl,
      aspectRatio: compressed.aspectRatio,
      createdAt: new Date().toISOString()
    };
    await saveCustomSticker(sticker);
    await addStickerElement(sticker);
  } catch {
    window.alert("This sticker could not be added.");
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
  if (!imageBytes) throw new Error(`Missing image file: ${clone.imagePath}`);

  clone.imageDataUrl = bytesToDataUrl(imageBytes, clone.imageMime || extensionMime(clone.imagePath));
  delete clone.imagePath;
  delete clone.imageMime;
  return clone;
}

function validateBackupPayload(backup) {
  if (!backup || typeof backup !== "object") throw new Error("Backup file is not valid.");
  if (!backup.schemaVersion) throw new Error("Backup is missing schemaVersion.");
  if (!Array.isArray(backup.photos)) throw new Error("Backup is missing photos.");
  if (!Array.isArray(backup.canvasElements)) throw new Error("Backup is missing canvas elements.");
  if (!Array.isArray(backup.customStickers)) throw new Error("Backup is missing stickers.");

  backup.photos.forEach((photo) => {
    if (!photo.id || !photo.dateKey || !photo.addedAt || !photo.imageDataUrl) {
      throw new Error("Backup has an incomplete photo record.");
    }
  });
}

async function parseBackupFile(file) {
  const files = await readZip(file);
  const backupBytes = files.get("backup.json");
  if (!backupBytes) throw new Error("Backup zip is missing backup.json.");

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
    showToast("Backup exported.");
  } catch (error) {
    showToast(error?.message || "Backup export failed.");
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
    showToast(error?.message || "Backup file is invalid.");
    return;
  }

  const confirmed = window.confirm("Restore this backup? Your current journal data will be replaced.");
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
    showToast("Backup restored.");
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
    showToast(error?.message || "Restore failed. Current data was kept.");
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
  const width = item.width || measureTextLayout(item.content, item.fontSize || 34).width;
  const height = item.height || measureTextLayout(item.content, item.fontSize || 34).height;
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
      await drawTransformedItem(context, item, "text", headerHeight, async (itemWidth) => {
        context.fillStyle = item.color || "#222222";
        context.font = `${item.fontWeight || "600"} ${item.fontSize || 34}px ${item.fontFamily || "-apple-system, BlinkMacSystemFont, Helvetica Neue, Arial, sans-serif"}`;
        drawTextLines(context, item.content, itemWidth, item.fontSize || 34, item.textAlign || "center");
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
      else reject(new Error("Could not create PNG."));
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

    showToast("Day image exported.");
  } catch (error) {
    showToast(error?.message || "Day export failed.");
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

  updater(element);
  await saveCanvasElement(element);
  render();
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

function applyInteractiveStyle(element, layout, itemType) {
  if (!element || !layout) return;

  element.style.left = `${layout.x}px`;
  element.style.top = `${layout.y}px`;
  element.style.zIndex = String(layout.zIndex || 1);
  element.style.setProperty("--rotation", `${layout.rotation || 0}deg`);
  element.style.setProperty("--scale", layout.scale || 1);

  if (itemType !== "text") {
    element.style.width = `${layout.width}px`;
    element.style.height = `${layout.height}px`;
  }

  if (layout.fontSize) element.style.setProperty("--font-size", `${layout.fontSize}px`);
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

function startPinchGesture(event, itemId, itemType) {
  const layout = getInteractiveLayout(itemId, itemType);
  const pointers = activePointersForItem(itemId, itemType);
  if (!layout || pointers.length < 2) return false;

  event.preventDefault();
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

  event.preventDefault();
  const gestureElement = event.target.closest(".canvas-item");
  gestureElement?.setPointerCapture?.(event.pointerId);
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
  if (element) element.style.zIndex = String(layout.zIndex);
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
    layout.x = clamp(gesture.startX + center.x - gesture.startPinchCenterX, -40, canvasWidth - 40);
    layout.y = clamp(gesture.startY + center.y - gesture.startPinchCenterY, -40, canvasHeight - 40);
    applyInteractiveStyle(element, layout, gesture.itemType);
    return;
  }

  const dx = event.clientX - gesture.startClientX;
  const dy = event.clientY - gesture.startClientY;
  const dimensions = surfaceDimensions(gesture.surface);

  if (gesture.mode === "drag") {
    layout.x = clamp(gesture.startX + dx, -40, dimensions.width - 40);
    layout.y = clamp(gesture.startY + dy, -40, dimensions.height - 40);
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
    layout.x = clamp(layout.x, -40, dimensions.width - 40);
    layout.y = clamp(layout.y, -40, dimensions.height - 40);
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

  setDeleteZoneVisible(false);
  element?.classList.remove("is-dragging", "is-over-delete", "is-gesturing");

  gesture.active = false;
  gesture.mode = "";
  gesture.itemId = "";
  gesture.itemType = "";
  gesture.startFontSize = 0;
  gesture.startScale = 1;
  const beforeSnapshot = gesture.beforeSnapshot;
  gesture.beforeSnapshot = null;
  gesture.pointerId = null;
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
    await persistInteractiveLayout(itemId, itemType);
    commitUndoSnapshot(beforeSnapshot);
  }
  if (pointer) activePointers.delete(pointerId);
  if (mode === "drag") debugInteraction("end drag", { elementId: itemId, itemType, deleted: false });
}

function endElementDrag(event) {
  endGesture(event);
}

function preventViewportGesture(event) {
  if (event.cancelable) event.preventDefault();
}

function isNativePasteTarget(target) {
  return Boolean(target?.closest?.("[data-native-paste-target]"));
}

function handleNativePastePointerDown(event) {
  const target = event.target.closest("[data-native-paste-target]");
  if (!target || state.view !== "single") return;

  state.nativePastePoint = canvasPointFromClient(event.clientX, event.clientY);
  focusNativePasteTarget(target);
}

function handleNativePasteClick(event) {
  const target = event.target.closest("[data-native-paste-target]");
  if (!target || state.view !== "single") return;

  if (state.selectedPhotoId || state.activePanel || state.addMenuOpen) {
    clearSelection();
    state.activePanel = "";
    closeCanvasMenusAndResetPoint();
    resetNativePasteTarget(target);
    render();
    return;
  }

  resetNativePasteTarget(target);
}

async function handleNativePaste(event) {
  const target = event.target.closest("[data-native-paste-target]");
  if (!target || state.view !== "single") return;

  event.preventDefault();
  const point = state.nativePastePoint || visibleCanvasCenterPoint();
  state.nativePastePoint = null;

  try {
    await createPastedContentFromData(event.clipboardData, point);
  } finally {
    resetNativePasteTarget(target);
  }
}

function handleNativePasteBeforeInput(event) {
  const target = event.target.closest("[data-native-paste-target]");
  if (!target) return;

  if (event.inputType !== "insertFromPaste" && event.inputType !== "insertFromPasteAsQuotation") {
    event.preventDefault();
  }
}

function handleNativePasteInput(event) {
  const target = event.target.closest("[data-native-paste-target]");
  if (!target) return;

  clearNativePasteTarget(target);
}

function handleNativePasteBlur(event) {
  const target = event.target.closest("[data-native-paste-target]");
  if (!target) return;

  resetNativePasteTarget(target);
}

function bindNativePasteTarget() {
  const target = nativePasteTargetElement();
  if (!target) return;

  if (target.contentEditable !== "plaintext-only") {
    target.contentEditable = "true";
  }

  target.addEventListener("pointerdown", handleNativePastePointerDown);
  target.addEventListener("click", handleNativePasteClick);
  target.addEventListener("paste", handleNativePaste);
  target.addEventListener("beforeinput", handleNativePasteBeforeInput);
  target.addEventListener("input", handleNativePasteInput);
  target.addEventListener("blur", handleNativePasteBlur);
}

document.addEventListener("pointerdown", (event) => {
  if (isPageTransitioning) return;
  if (stopDaybookNavPointerEvent(event)) return;
  if (startDayPress(event)) return;

  if (event.target.closest(".text-composer-overlay, .floating-toolbox, .sticker-sheet, .sticker-backdrop, .canvas-add-button, .add-menu-sheet, .add-menu-backdrop, .settings-sheet, .settings-backdrop, .settings-button, .header-icon-action")) return;

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

  if (event.target.classList.contains("free-canvas") && (state.selectedPhotoId || state.addMenuOpen)) {
    clearSelection();
    state.activePanel = "";
    closeCanvasMenus();
    render();
  }
});

window.addEventListener("pointermove", moveElementDrag);
window.addEventListener("pointerup", endElementDrag);
window.addEventListener("pointercancel", endElementDrag);
window.addEventListener("pointermove", moveDayPress);
window.addEventListener("pointerup", endDayPress);
window.addEventListener("pointercancel", cancelDayPress);
window.addEventListener("pointerleave", cancelDayPress);
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
  if (action === "open-add-menu") {
    event.stopPropagation();
    openAddMenu();
    return;
  }
  if (action === "close-add-menu") {
    closeCanvasMenusAndResetPoint();
    render();
    return;
  }
  if (action === "add-menu-photo") {
    const point = state.pendingInsertPoint || visibleCanvasCenterPoint();
    closeCanvasMenus();
    render();
    openPhotoPicker(point);
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
    state.activePanel = state.activePanel === "sticker" ? "" : "sticker";
    render();
    return;
  }
  if (action === "toggle-sticker-sheet") {
    state.stickerSheetState = state.stickerSheetState === "full" ? "half" : "full";
    render();
    return;
  }
  if (action === "add-sticker") {
    const customSticker = actionTarget.dataset.stickerType === "image"
      ? state.customStickers.find((sticker) => sticker.id === actionTarget.dataset.stickerId)
      : null;
    await addStickerElement({
      stickerType: actionTarget.dataset.stickerType || "emoji",
      content: actionTarget.dataset.stickerContent || "✨",
      color: actionTarget.dataset.stickerColor || "#222222",
      imageDataUrl: customSticker?.imageDataUrl || "",
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
  if (action === "text-style") {
    const style = textStyle(actionTarget.dataset.style);
    if (style) updateSelectedTextElement((element) => Object.assign(element, style));
    return;
  }
  if (action === "text-color") {
    const color = actionTarget.dataset.color;
    if (color) updateSelectedTextElement((element) => {
      element.color = color;
    });
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
    render();
    return;
  }
  if (action === "add-photo") {
    event.stopPropagation();
    openPhotoPicker();
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
  state.textComposer.value = composer.value;
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
