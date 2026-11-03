// Service worker mínimo: permite mostrar notificaciones del sistema en Android
// y, más adelante, recibir Web Push (ver README → "Notificaciones con la app cerrada").
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(url) && "focus" in client) return client.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});

// Listo para Web Push: el servidor enviará { title, body, url }.
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}
  event.waitUntil(
    self.registration.showNotification(data.title || "Tu pedido está listo", {
      body: data.body || "Acércate a la barra a recogerlo.",
      data: { url: data.url || "/" },
      vibrate: [200, 100, 200, 100, 400],
      tag: "pedido",
      renotify: true,
    }),
  );
});
