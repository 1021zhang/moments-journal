const noteStorageKey = "moments-journal.notes";

const photos = [
  { caption: "cafe", tone: "photo-cafe" },
  { caption: "walk", tone: "photo-walk" },
  { caption: "table", tone: "photo-table" },
  { caption: "flowers", tone: "photo-flowers" },
  { caption: "window", tone: "photo-window" },
  { caption: "street", tone: "photo-street" },
  { caption: "clouds", tone: "photo-clouds" },
  { caption: "desk", tone: "photo-desk" }
];

const days = [
  {
    id: "yesterday",
    label: "Yesterday",
    date: "",
    weekday: "",
    note: "orange light, warm coffee, a soft pause",
    emojis: ["🍊", "☕", "✨"],
    photos: [0, 1, 2, 3]
  },
  {
    id: "june-2",
    label: "2 June",
    date: "2 June",
    weekday: "Tuesday",
    note: "kept the tiny ordinary things",
    emojis: ["🌼", "🎧"],
    photos: [4, 5, 6]
  },
  {
    id: "june-1",
    label: "1 June",
    date: "1 June",
    weekday: "Monday",
    note: "three errands and one pretty sky",
    emojis: ["☁️", "🚶", "🧾"],
    photos: [2, 7, 0, 5]
  },
  {
    id: "may-31",
    label: "31 May",
    date: "31 May",
    weekday: "Sunday",
    note: "the desk slowly became a page",
    emojis: ["📎", "🍵"],
    photos: [3, 6, 4]
  }
];

const state = {
  view: "home",
  activeDayId: days[0].id,
  notes: loadNotes()
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

function getDay(dayId = state.activeDayId) {
  return days.find((day) => day.id === dayId) || days[0];
}

function noteFor(day) {
  return state.notes[day.id] || day.note;
}

function polaroid(photoIndex, options = {}) {
  const photo = photos[photoIndex % photos.length];
  const tilt = options.tilt || "0deg";
  const size = options.size || "";
  const layer = options.layer || "";

  return `
    <figure class="polaroid ${photo.tone} ${size} ${layer}" style="--tilt:${tilt};">
      <div class="photo-image" aria-hidden="true"></div>
      <figcaption>${photo.caption}</figcaption>
    </figure>
  `;
}

function statusBar() {
  return `
    <div class="status-bar" aria-hidden="true">
      <span>9:41</span>
      <span class="status-icons">● ● ▰</span>
    </div>
  `;
}

function dateTitle(day) {
  if (day.id === "yesterday") {
    return `<h2 class="date-heading yesterday-label">Yesterday</h2>`;
  }

  return `
    <h2 class="date-heading">
      <span>${day.date}</span>
      <i></i>
      <em>${day.weekday}</em>
    </h2>
  `;
}

function emojiLine(day) {
  return `<div class="tiny-emojis">${day.emojis.map((emoji) => `<span>${emoji}</span>`).join("")}</div>`;
}

function renderHome() {
  const pilePhotos = [0, 2, 4, 1, 6, 3];

  return `
    <main class="phone-screen home-view" aria-label="Memory Pile">
      ${statusBar()}
      <header class="app-header">
        <p>Moments</p>
        <h1>Memory Pile</h1>
      </header>

      <button class="memory-pile" type="button" data-action="open-daybook" aria-label="Open daybook">
        <span class="sticky-note note-one">sun<br />crumbs</span>
        <span class="sticky-note note-two">save it</span>
        <span class="floating-emoji emoji-one">🍊</span>
        <span class="floating-emoji emoji-two">✨</span>
        ${pilePhotos.map((photo, index) =>
          polaroid(photo, {
            tilt: ["-11deg", "8deg", "-4deg", "13deg", "-16deg", "5deg"][index],
            layer: `pile-${index + 1}`
          })
        ).join("")}
      </button>

      <footer class="home-footer">
        <button class="add-button" type="button" data-action="add-photo">Add Photos</button>
      </footer>
    </main>
  `;
}

function renderDaybook() {
  return `
    <main class="phone-screen daybook-view" aria-label="Daybook">
      ${statusBar()}
      <header class="daybook-header">
        <button class="icon-text-button" type="button" data-action="home">Pile</button>
        <h1>Daybook</h1>
        <button class="round-button" type="button" data-action="add-photo" aria-label="Add photos">+</button>
      </header>

      <div class="day-feed">
        ${days.map((day) => `
          <button class="day-section" type="button" data-day="${day.id}" aria-label="Open ${day.label}">
            ${dateTitle(day)}
            <div class="photo-strip">
              ${day.photos.map((photo, index) =>
                polaroid(photo, {
                  tilt: ["-4deg", "3deg", "-2deg", "5deg"][index] || "1deg",
                  size: "strip-photo"
                })
              ).join("")}
            </div>
            <p class="day-note">${escapeHtml(noteFor(day))}</p>
            ${emojiLine(day)}
          </button>
        `).join("")}
      </div>
    </main>
  `;
}

function renderSingleDay() {
  const day = getDay();
  const safeNote = escapeHtml(noteFor(day));

  return `
    <main class="phone-screen single-day-view" aria-label="Single Day Page">
      ${statusBar()}
      <nav class="single-nav">
        <button class="icon-text-button" type="button" data-action="daybook">Back</button>
        <button class="edit-button" type="button" data-action="edit-note">Edit</button>
      </nav>

      <header class="single-header">
        ${dateTitle(day)}
        <p>${safeNote}</p>
        ${emojiLine(day)}
      </header>

      <section class="single-collage">
        ${polaroid(day.photos[0], { tilt: "-2deg", size: "hero-photo" })}
        ${day.photos.slice(1, 4).map((photo, index) =>
          polaroid(photo, {
            tilt: ["7deg", "-8deg", "4deg"][index],
            size: `mini-photo mini-${index + 1}`
          })
        ).join("")}
        <span class="torn-paper">today felt small and full</span>
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

function showAddPhotoFeedback() {
  const button = document.querySelector("[data-action='add-photo']");
  if (!button) return;
  const original = button.textContent;
  button.textContent = "Added";
  window.setTimeout(() => {
    button.textContent = original;
  }, 950);
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
    showAddPhotoFeedback();
    return;
  }

  render();
});

render();
