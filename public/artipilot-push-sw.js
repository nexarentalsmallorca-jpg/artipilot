/* public/artipilot-push-sw.js */

self.addEventListener("install", (event) => {
  console.log("[ARTIPILOT_SW_INSTALL]");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[ARTIPILOT_SW_ACTIVATE]");

  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      self.registration.navigationPreload
        ? self.registration.navigationPreload.disable()
        : Promise.resolve(),
    ])
  );
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
  } catch (jsonError) {
    console.warn("[ARTIPILOT_SW_PUSH_JSON_PARSE_FAILED]", jsonError);

    try {
      return {
        title: "New WhatsApp message",
        body: event.data ? event.data.text() : "",
      };
    } catch (textError) {
      console.warn("[ARTIPILOT_SW_PUSH_TEXT_PARSE_FAILED]", textError);
      return {};
    }
  }
}

function getAbsoluteUrl(url) {
  const cleanUrl = safeString(url) || "/dashboard/inbox";

  try {
    return new URL(cleanUrl, self.location.origin).href;
  } catch {
    return `${self.location.origin}/dashboard/inbox`;
  }
}

self.addEventListener("push", (event) => {
  console.log("[ARTIPILOT_SW_PUSH_RECEIVED]");

  const payload = getNotificationPayload(event);

  const title = safeString(payload.title) || "New WhatsApp message";

  const body =
    safeString(payload.body) ||
    safeString(payload.message) ||
    "You received a new customer message.";

  const icon =
    safeString(payload.icon) ||
    "/artipilot-logo.png";

  const badge =
    safeString(payload.badge) ||
    "/artipilot-logo.png";

  const url = getAbsoluteUrl(payload.url || "/dashboard/inbox");

  const contactId = safeString(payload.contactId);
  const phone = safeString(payload.phone);

  const tag =
    safeString(payload.tag) ||
    (contactId
      ? `artipilot-whatsapp-message-${contactId}`
      : "artipilot-whatsapp-message");

  const notificationOptions = {
    body,
    icon,
    badge,
    tag,
    renotify: true,
    requireInteraction: false,
    silent: false,
    data: {
      url,
      contactId,
      phone,
      timestamp: Date.now(),
    },
  };

  event.waitUntil(
    self.registration
      .showNotification(title, notificationOptions)
      .then(() => {
        console.log("[ARTIPILOT_SW_NOTIFICATION_SHOWN]", {
          title,
          tag,
          url,
          contactId,
          phone,
        });
      })
      .catch((error) => {
        console.error("[ARTIPILOT_SW_NOTIFICATION_SHOW_FAILED]", error);
      })
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("[ARTIPILOT_SW_NOTIFICATION_CLICK]");

  event.notification.close();

  const targetUrl = getAbsoluteUrl(
    event.notification &&
      event.notification.data &&
      event.notification.data.url
      ? event.notification.data.url
      : "/dashboard/inbox"
  );

  event.waitUntil(
    self.clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clients) => {
        for (const client of clients) {
          const clientUrl = client.url || "";

          if (clientUrl.startsWith(self.location.origin)) {
            if ("focus" in client) {
              client.focus();
            }

            if ("navigate" in client) {
              return client.navigate(targetUrl);
            }

            return;
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      })
      .catch((error) => {
        console.error("[ARTIPILOT_SW_NOTIFICATION_CLICK_FAILED]", error);
      })
  );
});