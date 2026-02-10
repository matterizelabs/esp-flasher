const CACHE_NAME = "esp-web-flasher-v2";
const SCOPE_PATH = new URL(self.registration.scope).pathname.replace(/\/$/, "");
const CORE_ASSETS = [`${SCOPE_PATH}/`, `${SCOPE_PATH}/index.html`, `${SCOPE_PATH}/runtime-config.json`];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (requestUrl.pathname.startsWith(`${SCOPE_PATH}/api/`)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Keep HTML fresh so new releases are visible without manual cache clearing.
  if (event.request.mode === "navigate" || requestUrl.pathname.endsWith("/index.html")) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, copy).catch(() => undefined);
          });
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match(`${SCOPE_PATH}/index.html`)))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, copy).catch(() => undefined);
        });
        return response;
      });
    })
  );
});
