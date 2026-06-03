const noteStorageKey = "moments-journal.notes";
const localPhotosKey = "moments-journal.photos";
const dbName = "moments-journal";
const photoStoreName = "photos";
const canvasWidth = 358;
const canvasHeight = 560;
const stackPreviewWidth = 358;
const stackPreviewHeight = 360;

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
  pendingImportDateKey: "",
  notes: loadNotes(),
  userPhotos: [],
  db: null,
  storageMode: "indexedDB"
};

const gesture = {
  active: false,
  mode: "",
  photoId: "",
  surface: "",
  startClientX: 0,
  startClientY: 0,
  startX: 0,
  startY: 0,
  startWidth: 0,
  startHeight: 0,
  aspectRatio: 1,
  startRotation: 0,
  startAngle: 0,
  centerX: 0,
  centerY: 0
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

function uid() {
  return `photo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
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

function relativeLabel(dateKey) {
  const todayKey = todayDateKey();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateKey === todayKey) return { label: "Today" };
  if (dateKey === dateKeyFromDate(yesterday)) return { label: "Yesterday" };

  const date = dateFromKey(dateKey);
  return {
    date: new Intl.DateTimeFormat("en", { day: "numeric", month: "long" }).format(date),
    weekday: new Intl.DateTimeFormat("en", { weekday: "long" }).format(date)
  };
}

function noteFor(day) {
  return state.notes[day.id] || day.note || "";
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
    x: clamp(preset.x, 0, stackPreviewWidth - 40),
    y: clamp(preset.y, 8, stackPreviewHeight - 40),
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

function ensureLayoutsForPhotos() {
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

        if (!needsLayout) return;
        Object.assign(photo, generateLayout(photo, index));
        changed = true;
      });
  });

  if (changed) persistAllUserPhotos();
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
      note: `${photos.length} photo${photos.length === 1 ? "" : "s"} added on this day.`,
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
  if (day.label) {
    return `<h2 class="date-heading solo-label">${escapeHtml(day.label)}</h2>`;
  }

  return `
    <h2 class="date-heading">
      <span>${escapeHtml(day.date)}</span>
      <i></i>
      <em>${escapeHtml(day.weekday)}</em>
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

function renderEmptyHome() {
  return `
    <main class="memory-home memory-home-empty" aria-label="Memory Stack">
      <h1 class="sr-only">Memory Stack</h1>

      <section class="memory-empty-state">
        <p>Add your first memory.</p>
        <button class="add-photo-button" type="button" data-action="add-photo" aria-label="Add photos">+</button>
      </section>
    </main>
  `;
}

function renderHome() {
  const photos = stackPhotos();
  if (!photos.length) return renderEmptyHome();

  return `
    <main class="memory-home" aria-label="Memory Stack">
      <h1 class="sr-only">Memory Stack</h1>

      <button class="memory-stack-preview" type="button" data-action="open-daybook" aria-label="Open daybook">
        ${photos.map((photo, index) => memoryStackPhoto(photo, index, photos.length)).join("")}
      </button>

      <button class="memory-caption" type="button" data-action="open-daybook">A lot happened recently.</button>
      <button class="add-photo-button" type="button" data-action="add-photo" aria-label="Add photos">+</button>
    </main>
  `;
}

function renderEmptyDaybook() {
  return `
    <main class="phone-screen daybook-view" aria-label="Daybook">
      <header class="daybook-header">
        <button class="icon-text-button" type="button" data-action="home">Pile</button>
        <h1>Daybook</h1>
        <button class="round-button" type="button" data-action="add-photo" aria-label="Add photos">+</button>
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
        <button class="icon-text-button" type="button" data-action="home">Pile</button>
        <h1>Daybook</h1>
        <button class="round-button" type="button" data-action="add-photo" aria-label="Add photos">+</button>
      </header>

      <div class="day-feed">
        ${days.map((day) => `
          <button class="day-section" type="button" data-day="${day.id}" aria-label="Open ${day.label || day.date}">
            ${dateTitle(day)}
            <div class="photo-strip">
              ${day.photos.slice(0, 4).map((photo, index) =>
                polaroid(photo, {
                  tilt: ["-3deg", "1deg", "-1deg", "3deg"][index] || "1deg",
                  size: "strip-photo"
                })
              ).join("")}
            </div>
            <p class="day-note">${escapeHtml(noteFor(day))}</p>
          </button>
        `).join("")}
      </div>
    </main>
  `;
}

function freeCanvasPhoto(photo) {
  const selected = state.selectedSurface === "day" && state.selectedPhotoId === photo.id ? "is-selected" : "";
  const style = [
    `left:${photo.x}px`,
    `top:${photo.y}px`,
    `width:${photo.width}px`,
    `height:${photo.height}px`,
    `z-index:${photo.zIndex}`,
    `--rotation:${photo.rotation}deg`
  ].join(";");

  return `
    <div class="free-photo ${selected}" data-surface="day" data-photo-id="${photo.id}" style="${style}">
      <img src="${photo.src}" alt="" draggable="false" />
      <button class="delete-photo" type="button" data-action="delete-photo" aria-label="Delete photo">×</button>
      <span class="rotate-handle" aria-hidden="true">↻</span>
      <span class="resize-handle" aria-hidden="true"></span>
    </div>
  `;
}

function renderSingleDay() {
  const day = getDay();
  if (!day) return renderEmptyDaybook();

  const safeNote = escapeHtml(noteFor(day));

  return `
    <main class="phone-screen single-day-view" aria-label="Single Day Page">
      <nav class="single-nav">
        <button class="icon-text-button" type="button" data-action="daybook">Back</button>
        <button class="edit-button" type="button" data-action="edit-note">Edit</button>
      </nav>

      <header class="single-header">
        ${dateTitle(day)}
        <p>${safeNote}</p>
      </header>

      <section class="free-canvas" aria-label="Free layout canvas">
        ${day.photos.map(freeCanvasPhoto).join("")}
        <button class="canvas-add-button" type="button" data-action="add-photo" aria-label="Add photos">+</button>
      </section>
    </main>

    <dialog class="note-dialog" id="noteDialog">
      <form method="dialog">
        <label for="noteInput">Edit note</label>
        <textarea id="noteInput" maxlength="90">${safeNote}</textarea>
        <div class="dialog-actions">
          <button class="ghost-button" value="cancel" type="submit">Cancel</button>
          <button class="add-button" value="save" type="submit">Save</button>
        </div>
      </form>
    </dialog>
  `;
}

function render() {
  const app = document.querySelector("#app");
  app.innerHTML = {
    home: renderHome,
    daybook: renderDaybook,
    single: renderSingleDay
  }[state.view]();
}

function openDay(dayId) {
  state.activeDayId = dayId;
  state.selectedPhotoId = "";
  state.selectedSurface = "";
  state.view = "single";
  render();
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
    state.notes[day.id] = input.value.trim() || day.note;
    saveNotes();
    render();
  }, { once: true });
}

function openPhotoPicker() {
  const day = getDay();
  state.pendingImportDateKey = state.view === "single" && day?.dateKey ? day.dateKey : todayDateKey();
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

    const request = indexedDB.open(dbName, 2);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(photoStoreName)) {
        const store = db.createObjectStore(photoStoreName, { keyPath: "id" });
        store.createIndex("dateKey", "dateKey", { unique: false });
        store.createIndex("addedAt", "addedAt", { unique: false });
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

async function saveUserPhotos(records) {
  state.userPhotos = [...records, ...state.userPhotos].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  await persistAllUserPhotos();
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

async function handlePhotoSelection(event) {
  const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
  if (!files.length) return;

  const imported = [];
  const dateKey = state.pendingImportDateKey || todayDateKey();
  const existingForDay = state.userPhotos.filter((photo) => photo.dateKey === dateKey).length;

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
      imported.push(photo);
    } catch {
      // Skip files that fail to load or compress.
    }
  }

  if (!imported.length) {
    window.alert("No photos could be imported.");
    return;
  }

  try {
    await saveUserPhotos(imported);
  } catch {
    window.alert("Photos were compressed, but could not be saved locally.");
    return;
  }

  if (state.view === "single") {
    state.activeDayId = `user-${dateKey}`;
    state.selectedPhotoId = imported[0].id;
    state.selectedSurface = "day";
  }

  render();
}

function getUserPhoto(photoId) {
  return state.userPhotos.find((photo) => photo.id === photoId);
}

function selectPhoto(photoId) {
  const photo = getUserPhoto(photoId);
  if (!photo) return;

  state.selectedPhotoId = photoId;
  state.selectedSurface = "day";
  const maxZ = state.userPhotos.reduce((max, item) => Math.max(max, item.zIndex || 0), 0);
  photo.zIndex = maxZ + 1;
  updateUserPhoto(photo);
  render();
}

async function deleteSelectedPhoto(photoId) {
  const confirmed = window.confirm("Delete this photo?");
  if (!confirmed) return;

  await deleteUserPhoto(photoId);
  state.selectedPhotoId = "";
  state.selectedSurface = "";

  const day = getDay();
  if (!day) {
    state.view = "daybook";
    state.activeDayId = "";
  }

  render();
}

function surfaceDimensions(surface) {
  return { width: canvasWidth, height: canvasHeight };
}

function getInteractiveLayout(photoId, surface) {
  const photo = getUserPhoto(photoId);
  if (!photo) return null;

  return photo;
}

function maxZForSurface(surface) {
  return state.userPhotos.reduce((max, item) => Math.max(max, item.zIndex || 0), 0);
}

async function persistInteractiveLayout(photoId, surface) {
  const photo = getUserPhoto(photoId);
  if (photo) await updateUserPhoto(photo);
}

function elementForPhoto(photoId, surface) {
  return document.querySelector(`[data-surface="${surface}"][data-photo-id="${photoId}"]`);
}

function startPhotoGesture(event, mode, photoId, surface = "day") {
  const photo = getUserPhoto(photoId);
  const layout = getInteractiveLayout(photoId, surface);
  if (!photo || !layout) return;

  event.preventDefault();
  state.selectedPhotoId = photoId;
  state.selectedSurface = surface;
  gesture.active = true;
  gesture.mode = mode;
  gesture.photoId = photoId;
  gesture.surface = surface;
  gesture.startClientX = event.clientX;
  gesture.startClientY = event.clientY;
  gesture.startX = layout.x;
  gesture.startY = layout.y;
  gesture.startWidth = layout.width;
  gesture.startHeight = layout.height;
  gesture.aspectRatio = photo.aspectRatio || layout.width / layout.height || 1;
  gesture.startRotation = layout.rotation || 0;

  const rect = event.currentTarget?.closest?.(".free-photo")?.getBoundingClientRect()
    || elementForPhoto(photoId, surface)?.getBoundingClientRect();
  if (rect) {
    gesture.centerX = rect.left + rect.width / 2;
    gesture.centerY = rect.top + rect.height / 2;
    gesture.startAngle = Math.atan2(event.clientY - gesture.centerY, event.clientX - gesture.centerX);
  }

  layout.zIndex = maxZForSurface(surface) + 1;
  const element = elementForPhoto(photoId, surface);
  document.querySelectorAll(".free-photo.is-selected").forEach((photoElement) => {
    photoElement.classList.remove("is-selected");
  });
  element?.classList.add("is-selected");
  if (element) element.style.zIndex = String(layout.zIndex);
}

function updateGesture(event) {
  if (!gesture.active) return;

  const photo = getUserPhoto(gesture.photoId);
  const layout = getInteractiveLayout(gesture.photoId, gesture.surface);
  const element = elementForPhoto(gesture.photoId, gesture.surface);
  if (!photo || !layout || !element) return;

  const dx = event.clientX - gesture.startClientX;
  const dy = event.clientY - gesture.startClientY;
  const dimensions = surfaceDimensions(gesture.surface);

  if (gesture.mode === "drag") {
    layout.x = clamp(gesture.startX + dx, -40, dimensions.width - 40);
    layout.y = clamp(gesture.startY + dy, -40, dimensions.height - 40);
  }

  if (gesture.mode === "resize") {
    const projectedDelta = Math.max(dx, dy * gesture.aspectRatio);
    layout.width = clamp(gesture.startWidth + projectedDelta, 72, dimensions.width - 24);
    layout.height = layout.width / gesture.aspectRatio;
    layout.x = clamp(layout.x, -40, dimensions.width - 40);
    layout.y = clamp(layout.y, -40, dimensions.height - 40);
  }

  if (gesture.mode === "rotate") {
    const angle = Math.atan2(event.clientY - gesture.centerY, event.clientX - gesture.centerX);
    const delta = (angle - gesture.startAngle) * 180 / Math.PI;
    layout.rotation = Math.round((gesture.startRotation + delta) * 10) / 10;
  }

  element.style.left = `${layout.x}px`;
  element.style.top = `${layout.y}px`;
  element.style.width = `${layout.width}px`;
  element.style.height = `${layout.height}px`;
  element.style.setProperty("--rotation", `${layout.rotation}deg`);
}

function endGesture() {
  if (!gesture.active) return;

  const photoId = gesture.photoId;
  const surface = gesture.surface;
  gesture.active = false;
  gesture.mode = "";
  gesture.photoId = "";
  gesture.surface = "";

  if (photoId) persistInteractiveLayout(photoId, surface);
}

document.addEventListener("pointerdown", (event) => {
  const deleteButton = event.target.closest(".delete-photo");
  if (deleteButton) {
    const photoId = deleteButton.closest(".free-photo")?.dataset.photoId;
    if (photoId) deleteSelectedPhoto(photoId);
    return;
  }

  const resizeHandle = event.target.closest(".resize-handle");
  if (resizeHandle) {
    const owner = resizeHandle.closest(".free-photo");
    const photoId = owner?.dataset.photoId;
    const surface = owner?.dataset.surface || "day";
    if (photoId) startPhotoGesture(event, "resize", photoId, surface);
    return;
  }

  const rotateHandle = event.target.closest(".rotate-handle");
  if (rotateHandle) {
    const owner = rotateHandle.closest(".free-photo");
    const photoId = owner?.dataset.photoId;
    const surface = owner?.dataset.surface || "day";
    if (photoId) startPhotoGesture(event, "rotate", photoId, surface);
    return;
  }

  const freePhoto = event.target.closest(".free-photo");
  if (freePhoto) {
    startPhotoGesture(event, "drag", freePhoto.dataset.photoId, freePhoto.dataset.surface || "day");
    return;
  }

  if (event.target.classList.contains("free-canvas") && state.selectedPhotoId) {
    state.selectedPhotoId = "";
    state.selectedSurface = "";
    render();
  }
});

window.addEventListener("pointermove", updateGesture);
window.addEventListener("pointerup", endGesture);
window.addEventListener("pointercancel", endGesture);

document.addEventListener("click", (event) => {
  const dayTarget = event.target.closest("[data-day]");
  const actionTarget = event.target.closest("[data-action]");

  if (dayTarget) {
    openDay(dayTarget.dataset.day);
    return;
  }

  if (!actionTarget) return;

  const action = actionTarget.dataset.action;
  if (action === "open-daybook") {
    state.selectedPhotoId = "";
    state.selectedSurface = "";
    state.view = "daybook";
  }
  if (action === "home") {
    state.selectedPhotoId = "";
    state.selectedSurface = "";
    state.view = "home";
  }
  if (action === "daybook") {
    state.selectedPhotoId = "";
    state.selectedSurface = "";
    state.view = "daybook";
  }
  if (action === "edit-note") {
    editNote();
    return;
  }
  if (action === "add-photo") {
    event.stopPropagation();
    openPhotoPicker();
    return;
  }

  render();
});

document.querySelector("#photoInput").addEventListener("change", handlePhotoSelection);

async function initApp() {
  try {
    state.db = await openPhotoDatabase();
  } catch {
    state.storageMode = "localStorage";
  }

  state.userPhotos = await loadUserPhotos();
  ensureLayoutsForPhotos();
  render();
}

initApp();
