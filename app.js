const noteStorageKey = "moments-journal.notes";

const photos = [
  { caption: "cafe", src: "https://picsum.photos/seed/moments-cafe/320/320" },
  { caption: "walk", src: "https://picsum.photos/seed/moments-walk/320/320" },
  { caption: "table", src: "https://picsum.photos/seed/moments-table/320/320" },
  { caption: "flowers", src: "https://picsum.photos/seed/moments-flowers/320/320" },
  { caption: "window", src: "https://picsum.photos/seed/moments-window/320/320" },
  { caption: "street", src: "https://picsum.photos/seed/moments-street/320/320" },
  { caption: "friends", src: "https://picsum.photos/seed/moments-friends/320/320" },
  { caption: "desk", src: "https://picsum.photos/seed/moments-desk/320/320" }
];

const days = [
  {
    id: "yesterday",
    label: "Yesterday",
    date: "",
    weekday: "",
    note: "Hiked the ridge, slow coffee, good talks.",
    emojis: ["🍊", "☕"],
    photos: [0, 1, 2, 3]
  },
  {
    id: "june-2",
    label: "7 June",
    date: "7 June",
    weekday: "Saturday",
    note: "Rain on the windows, noodles after dark.",
    emojis: ["🌧️", "🍜"],
    photos: [4, 5, 6]
  },
  {
    id: "june-1",
    label: "6 June",
    date: "6 June",
    weekday: "Friday",
    note: "Small errands, bright sky, one good song.",
    emojis: ["☁️", "🎧"],
    photos: [2, 7, 0, 5]
  },
  {
    id: "may-31",
    label: "5 June",
    date: "5 June",
    weekday: "Thursday",
    note: "A quiet table and a pocket of time.",
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
    <figure class="polaroid ${size} ${layer}" style="--tilt:${tilt}; --photo-url:url('${photo.src}');">
      <div class="photo-image" aria-hidden="true"></div>
      <figcaption>${photo.caption}</figcaption>
    </figure>
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
      <h1 class="sr-only">Memory Pile</h1>

      <button class="memory-pile" type="button" data-action="open-daybook" aria-label="Open daybook">
        <span class="sticky-note note-one">last<br />week</span>
        <span class="floating-emoji emoji-one">✦</span>
        ${pilePhotos.map((photo, index) =>
          polaroid(photo, {
            tilt: ["-8deg", "5deg", "-3deg", "7deg", "-10deg", "3deg"][index],
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
  return `
    <main class="phone-screen daybook-view" aria-label="Daybook">
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
                  tilt: ["-3deg", "1deg", "-1deg", "3deg"][index] || "1deg",
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
  button.textContent = "✓";
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
