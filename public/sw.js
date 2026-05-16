self.addEventListener("install", function (event) {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      self.registration.navigationPreload
        ? self.registration.navigationPreload.disable()
        : Promise.resolve(),
    ])
  );
});

self.addEventListener("push", function (event) {
  let data = {
    title: "New WhatsApp message",
    body: "You received a new customer message.",
    url: "/dashboard/inbox",
    tag: "artipilot-whatsapp-message",
  };

  try {
    if (event.data) {
      const incomingData = event.data.json();

      data = {
        ...data,
        ...incomingData,
      };
    }
  } catch (error) {
    console.error("Push data parse error:", error);

    try {
      if (event.data) {
        data.body = event.data.text() || data.body;
      }
    } catch (textError) {
      console.error("Push data text parse error:", textError);
    }
  }

  const title = data.title || "New WhatsApp message";

  const options = {
    body: data.body || "You received a new customer message.",
    icon: "/artipilot-logo.png",
    badge: "/artipilot-logo.png",
    image: undefined,
    vibrate: [200, 100, 200],
    requireInteraction: false,
    silent: false,
    renotify: true,
    tag: data.tag || `artipilot-${Date.now()}`,
    timestamp: Date.now(),
    data: {
      url: data.url || "/dashboard/inbox",
      customerPhone: data.customerPhone || null,
      workspaceId: data.workspaceId || null,
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const rawUrl = event.notification?.data?.url || "/dashboard/inbox";
  const urlToOpen = new URL(rawUrl, self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(function (clientList) {
        for (const client of clientList) {
          const clientUrl = new URL(client.url);

          if (clientUrl.origin === self.location.origin) {
            if ("focus" in client) {
              client.focus();
            }

            if ("navigate" in client) {
              return client.navigate(urlToOpen);
            }

            return;
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }

        return undefined;
      })
  );
});

self.addEventListener("notificationclose", function () {
  // Keeps service worker stable on mobile when notifications are dismissed.
});