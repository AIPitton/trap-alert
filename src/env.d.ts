/// <reference types="astro/client" />

declare global {
  interface Window {
    requestMapNotifications?: () => Promise<string>
    simulateNewPin?: (opts?: { lat?: number; lng?: number; title?: string; description?: string }) => any
  }
}

export {}
