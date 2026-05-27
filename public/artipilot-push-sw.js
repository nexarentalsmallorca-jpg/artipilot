/* public/artipilot-push-sw.js */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function safeString(value) {
  return String(value || "").trim();
}

function getNotificationPayload(event) {
  try {
    if (!event.data) {
      return {};
    }

    return event.data.json();
  } catch {
    try {
      return {
        title: "New WhatsApp message",
        body: event.data ? event.data.text() : "",
      };
    } catch {
      return {};
    }
  }
}

self.addEventListener("push", (event) => {
  const payload = getNotificationPayload(event);

  const title = safeString(payload.title) || "New WhatsApp message";
  const body =
    safeString(payload.body) ||
    safeString(payload.message) ||
    "You received a new customer message.";

  const icon = safeString(payload.icon) || "/icons/icon-192.png";
  const badge = safeString(payload.badge) || "/icons/icon-192.png";
  const url = safeString(payload.url) || "/dashboard/inbox";

  const notificationOptions = {
    body,
    icon,
    badge,
    tag: safeString(payload.tag) || "artipilot-whatsapp-message",
    renotify: true,
    requireInteraction: false,
    data: {
      url,
      contactId: safeString(payload.contactId),
      phone: safeString(payload.phone),
    },
  };

  event.waitUntil(self.registration.showNotification(title, notificationOptions));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    (event.notification.data && event.notification.data.url) ||
    "/dashboard/inbox";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.focus();

          if ("navigate" in client) {
            return client.navigate(targetUrl);
          }

          return;
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});