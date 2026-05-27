"use client";

import { useEffect } from "react";

const CACHE_CLEANUP_KEY = "artipilot_private_legacy_cache_cleanup_v2";

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
            registrations.map((registration) => registration.unregister())
          );
        }

        if ("caches" in window) {
          const cacheNames = await caches.keys();

          await Promise.all(
            cacheNames.map((cacheName) => caches.delete(cacheName))
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