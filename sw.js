/* ================================================================
   sw.js — Service Worker for Olawale Birthday Page
   Strategy: Cache First → fall back to network.

   HOW IT WORKS:
   • First visit  : all listed assets are fetched from network
                    and stored in the device cache.
   • Return visits: every asset is served instantly from device
                    cache — no network request at all.
   • If a cached file is stale you can bump CACHE_VERSION below
     (e.g. "olawale-v2") and the old cache is deleted automatically.

   PLACE THIS FILE next to index.html (same folder / same origin).
================================================================ */

const CACHE_VERSION = "olawale-v1";

/* ── Files to pre-cache on install ──
   Add every media file used by the page here.
   Paths are relative to the Service Worker file location.         */
const PRECACHE_ASSETS = [
  "./",
  "./index.html",

  /* ── Hero video ── */
  "./hero.mov",

  /* ── Scene videos ── */
  "./video1.MP4",
  "./video2.MP4",

  /* ── Gallery photos ── */
  "./photo1.JPG",
  "./photo2.JPG",
  "./photo3.JPG",
  "./photo4.JPG",

  /* ── Music playlist ── */
  "./song1.mp3",
  "./song2.mp3",
  "./song3.mp3",
  "./song4.mp3",
  "./song5.mp3",

  /* ── Fonts (already served from Google CDN — skip if cross-origin issues arise) ── */
];

/* ── INSTALL: pre-cache all assets ── */
self.addEventListener("install", function (event) {
  self.skipWaiting(); /* activate immediately */

  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) {
      /* cache.addAll() fails if ANY request fails.
         We use individual add() calls so one missing file
         doesn't kill the entire install.                  */
      return Promise.allSettled(
        PRECACHE_ASSETS.map(function (url) {
          return cache.add(url).catch(function (err) {
            console.warn("[SW] Failed to pre-cache:", url, err);
          });
        })
      );
    })
  );
});

/* ── ACTIVATE: delete old caches ── */
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(
        keys
          .filter(function (key) { return key !== CACHE_VERSION; })
          .map(function (key) {
            console.log("[SW] Deleting old cache:", key);
            return caches.delete(key);
          })
      );
    }).then(function () {
      return self.clients.claim(); /* take control of all open tabs */
    })
  );
});

/* ── FETCH: Cache First → Network Fallback ── */
self.addEventListener("fetch", function (event) {
  /* Only handle GET requests for same-origin assets */
  if (event.request.method !== "GET") return;

  /* Skip cross-origin requests (Google Fonts CDN, analytics, etc.) */
  var url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(event.request).then(function (cached) {
      if (cached) {
        /* ✅ Served from device cache — instant */
        return cached;
      }

      /* 🌐 Not in cache yet — fetch from network and cache it */
      return fetch(event.request).then(function (response) {
        /* Only cache valid responses */
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        /* Clone: one copy for the cache, one for the browser */
        var responseToCache = response.clone();
        caches.open(CACHE_VERSION).then(function (cache) {
          cache.put(event.request, responseToCache);
        });

        return response;
      }).catch(function () {
        /* Offline + not cached — return a minimal offline response */
        return new Response("Offline — please reconnect.", {
          status: 503,
          statusText: "Service Unavailable",
          headers: { "Content-Type": "text/plain" }
        });
      });
    })
  );
});
