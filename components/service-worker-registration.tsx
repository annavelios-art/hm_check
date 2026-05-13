"use client"

import { useEffect } from "react"

/**
 * Service Worker Registrierung für PWA-Funktionalität
 * Ermöglicht Offline-Nutzung der App
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Service Worker registrieren
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registriert:", registration.scope)
          
          // Auf Updates prüfen
          registration.addEventListener("updatefound", () => {
            const newWorker = registration.installing
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  console.log("Neue Version verfügbar")
                }
              })
            }
          })
        })
        .catch((error) => {
          console.error("Service Worker Registrierung fehlgeschlagen:", error)
        })
    }
  }, [])

  return null
}
