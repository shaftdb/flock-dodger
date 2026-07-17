/**
 * Flock Dodger — service worker
 * Caches app shell for offline UI; network-first for shell so updates land on phones.
 * Bump CACHE_VERSION on every release that changes HTML/CSS/JS.
 */

const CACHE_VERSION = "flock-dodger-v2-mobile-sheet";
const SHELL = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./js/config.js",
  "./js/cameras.js",
  "./js/overpass.js",
  "./js/geocoding.js",
  "./js/routing.js",
  "./js/storage.js",
  "./js/export-maps.js",
  "./js/share.js",
  "./js/gpx.js",
  "./js/trip-mode.js",
  "./js/premium.js",
  "./js/premium-ui.js",
  "./js/pwa.js",
  "./privacy.html",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Bypass non-http(s)
  if (!url.protocol.startsWith("http")) return;

  // Network-first for APIs & map tiles
  const isApi =
    url.hostname.includes("nominatim") ||
    url.hostname.includes("project-osrm") ||
    url.hostname.includes("basemaps.cartocdn") ||
    url.hostname.includes("tile") ||
    url.hostname.includes("openstreetmap");

  if (isApi) {
    event.respondWith(
      fetch(request)
        .then((res) => res)
        .catch(() => caches.match(request))
    );
    return;
  }

  // App shell (HTML/CSS/JS): network-first so phone refreshes get new UI.
  // Fall back to cache only when offline.
  if (url.origin === self.location.origin) {
    const isShell =
      url.pathname.endsWith(".html") ||
      url.pathname.endsWith("/") ||
      url.pathname.endsWith(".css") ||
      url.pathname.endsWith(".js") ||
      url.pathname.endsWith("manifest.json");

    if (isShell) {
      event.respondWith(
        fetch(request)
          .then((res) => {
            if (res && res.ok) {
              const clone = res.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
            }
            return res;
          })
          .catch(() => caches.match(request).then((c) => c || caches.match("./index.html")))
      );
      return;
    }

    // Other same-origin (icons, etc.): stale-while-revalidate
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((res) => {
            if (res && res.ok) {
              const clone = res.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // CDN assets (Leaflet, fonts, Tailwind): stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res && res.ok) {
            const clone = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
