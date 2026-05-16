self.addEventListener("push", function (event) {
  let data = {
    title: "New WhatsApp message",
    body: "You received a new customer message.",
    url: "/dashboard/inbox",
  };

  try {
    if (event.data) {
      data = {
        ...data,
        ...event.data.json(),
      };
    }
  } catch (error) {
    console.error("Push data parse error:", error);
  }

  const title = data.title || "New WhatsApp message";

  const options = {
    body: data.body || "You received a new customer message.",
    icon: "/artipilot-logo.png",
    badge: "/artipilot-logo.png",
    data: {
      url: data.url || "/dashboard/inbox",
    },
    tag: data.tag || "artipilot-whatsapp-message",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const urlToOpen = event.notification?.data?.url || "/dashboard/inbox";

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then(function (clientList) {
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if ("navigate" in client) {
              return client.navigate(urlToOpen);
            }
            return;
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen);
        }
      })
  );
});