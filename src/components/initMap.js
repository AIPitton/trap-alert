import L from 'leaflet'

export default function init() {
  // Wait for DOM
  if (!document) return
  const el = document.getElementById('map')
  if (!el) return

  // Prevent double-init
  if (el._leafletInit) return
  el._leafletInit = true

  const map = L.map(el).setView([48.12, 11.54], 13)

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  // demo marker
  L.marker([48.12, 11.54]).addTo(map).bindPopup('Demo alert location').openPopup()
}

// export a URL-like object for Astro script import
export const src = new URL(import.meta.url).href

// Also auto-run when script module is evaluated client-side
if (typeof window !== 'undefined') {
  // Defer init to allow element to exist
  window.addEventListener('DOMContentLoaded', init)
}
