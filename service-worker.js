const CACHE_NAME = "moments-journal-v71";
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
  "assets/tapes/blue-bird/repeat.svg",
  "assets/tapes/blue-bird/right-cap.svg",
  "assets/tapes/blue-bird/roll-preview-product.png",
  "assets/sticker-packs/cat-y2k-pack/package.png",
  "assets/sticker-packs/positive-talk-pack/package.png",
  "assets/sticker-packs/world-cup-star-pack/package.png",
  "assets/sticker-packs/urban-zoo/cover.png",
  "assets/sticker-packs/mj-icons-pack/cover.png"
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
