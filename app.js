const noteStorageKey = "moments-journal.notes";
const localPhotosKey = "moments-journal.photos";
const dbName = "moments-journal";
const photoStoreName = "photos";

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

const mockDays = [
  {
    id: "mock-yesterday",
    label: "Yesterday",
    note: "Hiked the ridge, slow coffee, good talks.",
    photos: [0, 1, 2, 3]
  },
  {
    id: "mock-june-7",
    date: "7 June",
    weekday: "Saturday",
    note: "Rain on the windows, noodles after dark.",
    photos: [4, 5, 6]
  },
  {
    id: "mock-june-6",
    date: "6 June",
    weekday: "Friday",
    note: "Small errands, bright sky, one good song.",
    photos: [2, 7, 0, 5]
  },
  {
    id: "mock-june-5",
    date: "5 June",
    weekday: "Thursday",
    note: "A quiet table and a pocket of time.",
    photos: [3, 6, 4]
  }
];

const state = {
  view: "home",
  activeDayId: "mock-yesterday",
  notes: loadNotes(),
  userPhotos: [],
  db: null,
  storageMode: "indexedDB"
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

function relativeLabel(dateKey) {
  const todayKey = dateKeyFromDate(new Date());
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
  return state.notes[day.id] || day.note;
}

function normalizeUserPhoto(photo) {
  return {
    id: photo.id,
    type: "user",
    src: photo.imageDataUrl,
    label: photo.label || "",
    caption: photo.label || "",
    addedAt: photo.addedAt,
    dateKey: photo.dateKey
  };
}

function buildDayModels() {
  const groups = new Map();

  state.userPhotos
    .slice()
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    .forEach((photo) => {
      if (!groups.has(photo.dateKey)) groups.set(photo.dateKey, []);
      groups.get(photo.dateKey).push(normalizeUserPhoto(photo));
    });

  const userDays = Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([dateKey, photos]) => {
      const title = relativeLabel(dateKey);
      return {
        id: `user-${dateKey}`,
        dateKey,
        isUserDay: true,
        note: `${photos.length} photo${photos.length === 1 ? "" : "s"} added on this day.`,
        photos,
        ...title
      };
    });

  const sampleDays = mockDays.map((day) => ({
    ...day,
    isUserDay: false,
    photos: day.photos.map((index) => mockPhotos[index])
  }));

  return [...userDays, ...sampleDays];
}

function getDay(dayId = state.activeDayId) {
  return buildDayModels().find((day) => day.id === dayId) || buildDayModels()[0];
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

function renderHome() {
  const userPile = state.userPhotos
    .slice()
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    .map(normalizeUserPhoto);
  const pilePhotos = (userPile.length ? [...userPile, ...mockPhotos] : mockPhotos).slice(0, 8);
  const tilts = ["-8deg", "5deg", "-3deg", "7deg", "-10deg", "3deg", "-5deg", "6deg"];

  return `
    <main class="phone-screen home-view" aria-label="Memory Pile">
      <h1 class="sr-only">Memory Pile</h1>

      <button class="memory-pile" type="button" data-action="open-daybook" aria-label="Open daybook">
        ${pilePhotos.map((photo, index) =>
          polaroid(photo, {
            tilt: tilts[index],
            layer: `pile-${index + 1}`
          })
        ).join("")}
      </button>

      <footer class="home-footer">
        <p>A lot happened last week.</p>
        <button class="home-add-button" type="button" data-action="add-photo" aria-label="Add photos">+</button>
      </footer>
    </main>
  `;
}

function renderDaybook() {
  const days = buildDayModels();
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

function renderSingleDay() {
  const day = getDay();
  const safeNote = escapeHtml(noteFor(day));
  const collagePhotos = day.photos.slice(0, 4);

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

      <section class="single-collage">
        ${collagePhotos[0] ? polaroid(collagePhotos[0], { tilt: "-2deg", size: "hero-photo" }) : ""}
        ${collagePhotos.slice(1, 4).map((photo, index) =>
          polaroid(photo, {
            tilt: ["7deg", "-8deg", "4deg"][index],
            size: `mini-photo mini-${index + 1}`
          })
        ).join("")}
      </section>

      ${day.isUserDay ? `
        <button class="delete-day-button" type="button" data-action="delete-user-day">
          Delete imported photos
        </button>
      ` : ""}
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
  state.view = "single";
  render();
}

function editNote() {
  const dialog = document.querySelector("#noteDialog");
  const input = document.querySelector("#noteInput");
  const day = getDay();
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

    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.createObjectStore(photoStoreName, { keyPath: "id" });
      store.createIndex("dateKey", "dateKey", { unique: false });
      store.createIndex("addedAt", "addedAt", { unique: false });
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

async function saveUserPhotos(records) {
  if (state.storageMode === "localStorage") {
    const current = JSON.parse(localStorage.getItem(localPhotosKey) || "[]");
    localStorage.setItem(localPhotosKey, JSON.stringify([...records, ...current]));
    return;
  }

  const transaction = state.db.transaction(photoStoreName, "readwrite");
  const store = transaction.objectStore(photoStoreName);
  records.forEach((record) => store.put(record));
  await transactionDone(transaction);
}

async function deleteUserPhotosByDateKey(dateKey) {
  if (state.storageMode === "localStorage") {
    const current = JSON.parse(localStorage.getItem(localPhotosKey) || "[]");
    localStorage.setItem(localPhotosKey, JSON.stringify(current.filter((photo) => photo.dateKey !== dateKey)));
    return;
  }

  const transaction = state.db.transaction(photoStoreName, "readwrite");
  const store = transaction.objectStore(photoStoreName);
  state.userPhotos
    .filter((photo) => photo.dateKey === dateKey)
    .forEach((photo) => store.delete(photo.id));
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
    return blobToDataUrl(blob);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function handlePhotoSelection(event) {
  const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith("image/"));
  if (!files.length) return;

  const imported = [];

  for (const file of files) {
    try {
      const addedAt = new Date().toISOString();
      const dateKey = dateKeyFromDate(new Date(addedAt));
      const imageDataUrl = await compressImage(file);
      imported.push({
        id: uid(),
        imageDataUrl,
        addedAt,
        dateKey,
        label: ""
      });
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

  state.userPhotos = [...imported, ...state.userPhotos].sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  render();
}

async function deleteActiveUserDay() {
  const day = getDay();
  if (!day.isUserDay) return;

  const confirmed = window.confirm("Delete imported photos from this day?");
  if (!confirmed) return;

  await deleteUserPhotosByDateKey(day.dateKey);
  state.userPhotos = state.userPhotos.filter((photo) => photo.dateKey !== day.dateKey);
  state.activeDayId = buildDayModels()[0]?.id || "";
  state.view = "daybook";
  render();
}

document.addEventListener("click", (event) => {
  const dayTarget = event.target.closest("[data-day]");
  const actionTarget = event.target.closest("[data-action]");

  if (dayTarget) {
    openDay(dayTarget.dataset.day);
    return;
  }

  if (!actionTarget) return;

  const action = actionTarget.dataset.action;
  if (action === "open-daybook") state.view = "daybook";
  if (action === "home") state.view = "home";
  if (action === "daybook") state.view = "daybook";
  if (action === "edit-note") {
    editNote();
    return;
  }
  if (action === "add-photo") {
    openPhotoPicker();
    return;
  }
  if (action === "delete-user-day") {
    deleteActiveUserDay();
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
  render();
}

initApp();
