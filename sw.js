/**
 * Flock Dodger — service worker
 * Caches app shell for offline UI; network-first for tiles/API.
 */

const CACHE_VERSION = "flock-dodger-v1";
const SHELL = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./js/config.js",
  "./js/camera-data.js",
  "./js/cameras.js",
  "./js/overpass.js",
  "./js/geocoding.js",
  "./js/routing.js",
  "./js/storage.js",
  "./js/export-maps.js",
  "./js/premium.js",
  "./js/premium-ui.js",
  "./js/pwa.js",
  "./manifest.json",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
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

  // Same-origin: cache-first with network update
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetched = fetch(request)
          .then((res) => {
            if (res && res.ok) {
              const clone = res.clone();
              caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
            }
            return res;
          })
          .catch(() => cached);

        return cached || fetched;
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
