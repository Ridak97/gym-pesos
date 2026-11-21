// Guarda la app en el iPhone para que funcione sin internet.
// Cambia VERSION cada vez que actualices index.html.
const VERSION = "pesos-v6";
const PHOTOS = "pesos-fotos"; // fotos de internet: se conservan entre versiones
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== PHOTOS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const url = new URL(e.request.url);
  const own = url.origin === location.origin;

  if (!own) {
    // Imagen de otra web: primero la copia guardada; si no hay, se descarga y se guarda.
    e.respondWith(
      caches.open(PHOTOS).then((c) => c.match(e.request.url).then((hit) => hit || fetch(e.request).then((res) => {
        if (res && (res.ok || res.type === "opaque")) c.put(e.request.url, res.clone());
        return res;
      })))
    );
    return;
  }

  // Archivos de la app: primero la copia guardada; si hay red, se actualiza en segundo plano.
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => {
      const net = fetch(e.request).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit || caches.match("./index.html"));
      return hit || net;
    })
  );
});
