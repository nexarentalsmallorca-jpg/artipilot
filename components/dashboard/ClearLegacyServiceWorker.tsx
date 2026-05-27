"use client";

import { useEffect } from "react";

const CACHE_CLEANUP_KEY = "artipilot_private_legacy_cache_cleanup_v3";
const PUSH_SERVICE_WORKER_FILE = "artipilot-push-sw.js";

function isArtipilotPushServiceWorker(registration: ServiceWorkerRegistration) {
  const activeUrl = registration.active?.scriptURL || "";
  const installingUrl = registration.installing?.scriptURL || "";
  const waitingUrl = registration.waiting?.scriptURL || "";

  return (
    activeUrl.includes(PUSH_SERVICE_WORKER_FILE) ||
    installingUrl.includes(PUSH_SERVICE_WORKER_FILE) ||
    waitingUrl.includes(PUSH_SERVICE_WORKER_FILE)
  );
}

export default function ClearLegacyServiceWorker() {
  useEffect(() => {
    async function clearLegacyCacheOnce() {
      try {
        if (typeof window === "undefined") {
          return;
        }

        const alreadyCleaned = window.localStorage.getItem(CACHE_CLEANUP_KEY);

        if (alreadyCleaned === "true") {
          return;
        }

        if ("serviceWorker" in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();

          await Promise.all(
            registrations.map(async (registration) => {
              if (isArtipilotPushServiceWorker(registration)) {
                console.log(
                  "[ARTIPILOT_PRIVATE] Keeping push service worker:",
                  registration.scope
                );
                return;
              }

              console.log(
                "[ARTIPILOT_PRIVATE] Removing legacy service worker:",
                registration.scope
              );

              await registration.unregister();
            })
          );
        }

        if ("caches" in window) {
          const cacheNames = await caches.keys();

          await Promise.all(
            cacheNames.map(async (cacheName) => {
              console.log("[ARTIPILOT_PRIVATE] Removing legacy cache:", cacheName);
              await caches.delete(cacheName);
            })
          );
        }

        window.localStorage.setItem(CACHE_CLEANUP_KEY, "true");
      } catch (error) {
        console.warn("[ARTIPILOT_PRIVATE] Legacy cache cleanup failed:", error);
      }
    }

    void clearLegacyCacheOnce();
  }, []);

  return null;
}