const noteStorageKey = "moments-journal.notes";

const photoStyles = [
  { sky: "#f7c5a4", mid: "#f6de9a", ground: "#7aa898", accent: "#d66f45", caption: "warm street" },
  { sky: "#b8dce3", mid: "#f6f0d9", ground: "#6f9f87", accent: "#ec9f55", caption: "quiet park" },
  { sky: "#dfc6ef", mid: "#fff0c8", ground: "#8d96c9", accent: "#d88161", caption: "late cafe" },
  { sky: "#f2b6ae", mid: "#ffe2a8", ground: "#5b8f8f", accent: "#cc5c3f", caption: "tiny trip" },
  { sky: "#c9e6d6", mid: "#f9eec2", ground: "#d58c64", accent: "#4f8d73", caption: "window light" },
  { sky: "#bfd2f2", mid: "#f7d7b1", ground: "#7e987b", accent: "#de7652", caption: "soft evening" }
];

const days = [
  {
    id: "yesterday",
    title: "Yesterday",
    dateLine: "2 June · Tuesday",
    note: "A little orange light stayed on the table after everyone left.",
    emojis: ["🍊", "☕", "✨"],
    photos: [0, 2, 4, 1]
  },
  {
    id: "sunday",
    title: "1 June · Monday",
    dateLine: "Slow morning",
    note: "Bought flowers, forgot the receipt, kept the mood.",
    emojis: ["🌼", "🎧", "🧡"],
    photos: [3, 5, 1]
  },
  {
    id: "saturday",
    title: "31 May · Sunday",
    dateLine: "Errands and clouds",
    note: "Three small stops turned into a whole page of memories.",
    emojis: ["☁️", "🧾", "🚶"],
    photos: [2, 0, 5, 4]
  },
  {
    id: "friday",
    title: "30 May · Saturday",
    dateLine: "Desk notes",
    note: "The desk was messy, but the day finally felt arranged.",
    emojis: ["📎", "🍵", "🌙"],
    photos: [4, 1, 3]
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

function photoVars(photoIndex) {
  const photo = photoStyles[photoIndex % photoStyles.length];
  return `--sky:${photo.sky};--mid:${photo.mid};--ground:${photo.ground};--photo-accent:${photo.accent};`;
}

function polaroid(photoIndex, options = {}) {
  const photo = photoStyles[photoIndex % photoStyles.length];
  const caption = options.caption || photo.caption;
  const tilt = options.tilt || "0deg";
  const size = options.size || "";
  const depth = options.depth || "";

  return `
    <figure class="polaroid ${size} ${depth}" style="${photoVars(photoIndex)}--tilt:${tilt};">
      <div class="photo-art" aria-hidden="true">
        <span class="sun"></span>
        <span class="hill hill-one"></span>
        <span class="hill hill-two"></span>
        <span class="tape-mark"></span>
      </div>
      <figcaption>${caption}</figcaption>
    </figure>
  `;
}

function renderHome() {
  const pilePhotos = [0, 2, 4, 1, 5, 3];

  return `
    <main class="home-view" aria-label="Memory Pile">
      <header class="home-header">
        <p class="kicker">Moments Journal</p>
        <h1>Memory Pile</h1>
      </header>

      <button class="memory-pile" type="button" data-action="open-daybook" aria-label="Open daybook">
        <span class="sticky-note note-one">sunlight<br />on paper</span>
        <span class="sticky-note note-two">keep this</span>
        <span class="floating-emoji emoji-one">🍊</span>
        <span class="floating-emoji emoji-two">✨</span>
        <span class="floating-emoji emoji-three">☕</span>
        ${pilePhotos.map((photo, index) =>
          polaroid(photo, {
            tilt: ["-12deg", "8deg", "-4deg", "14deg", "-18deg", "5deg"][index],
            depth: `pile-${index + 1}`
          })
        ).join("")}
      </button>

      <footer class="home-footer">
        <button class="add-button" type="button" data-action="add-photo">Add Photos</button>
        <p>Mock photos for a clickable scrapbook prototype</p>
      </footer>
    </main>
  `;
}

function renderDaybook() {
  return `
    <main class="daybook-view" aria-label="Daybook">
      <nav class="top-nav">
        <button class="back-button" type="button" data-action="home">Memory Pile</button>
        <p class="kicker">Daybook</p>
      </nav>

      <section class="daybook-hero">
        <h1>Collected by day</h1>
        <p>Photos first, little notes second.</p>
      </section>

      <div class="day-sections">
        ${days.map((day) => `
          <button class="day-section" type="button" data-day="${day.id}" aria-label="Open ${day.title}">
            <div class="day-copy">
              <span>${day.dateLine}</span>
              <h2>${day.title}</h2>
              <p>${escapeHtml(noteFor(day))}</p>
              <div class="emoji-row" aria-label="Emoji memories">
                ${day.emojis.map((emoji) => `<span>${emoji}</span>`).join("")}
              </div>
            </div>
            <div class="day-photo-strip">
              ${day.photos.map((photo, index) =>
                polaroid(photo, {
                  tilt: ["-7deg", "4deg", "-3deg", "8deg"][index] || "2deg",
                  size: index === 0 ? "strip-main" : "strip-small"
                })
              ).join("")}
            </div>
          </button>
        `).join("")}
      </div>
    </main>
  `;
}

function renderSingleDay() {
  const day = getDay();
  const note = noteFor(day);
  const safeNote = escapeHtml(note);

  return `
    <main class="single-day-view" aria-label="Single Day Page">
      <nav class="top-nav">
        <button class="back-button" type="button" data-action="daybook">Daybook</button>
        <button class="edit-button" type="button" data-action="edit-note">Edit</button>
      </nav>

      <header class="single-header">
        <p class="kicker">${day.dateLine}</p>
        <h1>${day.title}</h1>
      </header>

      <section class="scrapbook-page">
        <aside class="scrap-note">
          <div class="emoji-row">
            ${day.emojis.map((emoji) => `<span>${emoji}</span>`).join("")}
          </div>
          <p>${safeNote}</p>
        </aside>

        <div class="collage">
          ${polaroid(day.photos[0], { tilt: "-3deg", size: "hero-photo" })}
          ${day.photos.slice(1, 4).map((photo, index) =>
            polaroid(photo, {
              tilt: ["8deg", "-10deg", "5deg"][index],
              size: `mini-photo mini-${index + 1}`
            })
          ).join("")}
          <span class="orange-dot dot-one"></span>
          <span class="orange-dot dot-two"></span>
          <span class="paper-clip"></span>
        </div>
      </section>
    </main>

    <dialog class="note-dialog" id="noteDialog">
      <form method="dialog">
        <label for="noteInput">Edit note</label>
        <textarea id="noteInput" maxlength="140">${safeNote}</textarea>
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
  button.textContent = "Added to the pile";
  window.setTimeout(() => {
    button.textContent = "Add Photos";
  }, 1200);
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
