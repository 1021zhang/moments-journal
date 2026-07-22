const CACHE_NAME = "moments-journal-v76";
const APP_SHELL = [
  "./",
  "index.html",
  "sticker-packs.js",
  "app.js",
  "styles.css",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "assets/tapes/blue-bird/left-cap.svg",
  "assets/tapes/blue-bird/texture.svg",
  "assets/tapes/blue-bird/right-cap.svg",
  "assets/tapes/blue-bird/roll-preview.png",
  "assets/tapes/blue-bird/manifest.json",
  "assets/tapes/color-chevron/left-cap.svg",
  "assets/tapes/color-chevron/texture.svg",
  "assets/tapes/color-chevron/right-cap.svg",
  "assets/tapes/color-chevron/roll-preview.png",
  "assets/tapes/color-chevron/manifest.json",
  "assets/tapes/grid-paper/left-cap.svg",
  "assets/tapes/grid-paper/texture.svg",
  "assets/tapes/grid-paper/right-cap.svg",
  "assets/tapes/grid-paper/roll-preview.png",
  "assets/tapes/grid-paper/manifest.json",
  "assets/tapes/beige-paper/left-cap.svg",
  "assets/tapes/beige-paper/texture.svg",
  "assets/tapes/beige-paper/right-cap.svg",
  "assets/tapes/beige-paper/roll-preview.png",
  "assets/tapes/beige-paper/manifest.json",
  "assets/tapes/flower/left-cap.svg",
  "assets/tapes/flower/texture.svg",
  "assets/tapes/flower/right-cap.svg",
  "assets/tapes/flower/roll-preview.png",
  "assets/tapes/flower/manifest.json",
  "assets/tapes/newspaper/left-cap.svg",
  "assets/tapes/newspaper/texture.svg",
  "assets/tapes/newspaper/right-cap.svg",
  "assets/tapes/newspaper/roll-preview.png",
  "assets/tapes/newspaper/manifest.json",
  "assets/tapes/clear-pet/left-cap.svg",
  "assets/tapes/clear-pet/texture.svg",
  "assets/tapes/clear-pet/right-cap.svg",
  "assets/tapes/clear-pet/roll-preview.png",
  "assets/tapes/clear-pet/manifest.json",
  "assets/sticker-packs/cat-y2k-pack/package.png",
  "assets/sticker-packs/positive-talk-pack/package.png",
  "assets/sticker-packs/world-cup-star-pack/package.png",
  "assets/sticker-packs/urban-zoo/cover.png",
  "assets/sticker-packs/mj-icons-pack/cover.png",
  "assets/sticker-packs/apple-style/cover.png"
];

function appShellPath(pathname) {
  const scopePath = new URL(self.registration.scope).pathname;
  const relativePath = pathname.startsWith(scopePath)
    ? pathname.slice(scopePath.length)
    : pathname.replace(/^\//, "");

  return relativePath || "./";
}

function isAppShellRequest(request) {
  if (request.mode === "navigate") return true;

  const requestUrl = new URL(request.url);
  const shellPath = appShellPath(requestUrl.pathname);
  return APP_SHELL.includes(shellPath);
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return caches.match(request).then((cachedResponse) => cachedResponse || caches.match("./"));
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (isAppShellRequest(event.request)) {
    event.respondWith(networkFirst(event.request));
  }
});
