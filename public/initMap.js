import Map from 'https://esm.sh/ol@7.4.0/Map'
import View from 'https://esm.sh/ol@7.4.0/View'
import TileLayer from 'https://esm.sh/ol@7.4.0/layer/Tile'
import OSM from 'https://esm.sh/ol@7.4.0/source/OSM'
import VectorLayer from 'https://esm.sh/ol@7.4.0/layer/Vector'
import VectorSource from 'https://esm.sh/ol@7.4.0/source/Vector'
import Feature from 'https://esm.sh/ol@7.4.0/Feature'
import Point from 'https://esm.sh/ol@7.4.0/geom/Point'
import { fromLonLat, toLonLat } from 'https://esm.sh/ol@7.4.0/proj'
import Style from 'https://esm.sh/ol@7.4.0/style/Style'
import Icon from 'https://esm.sh/ol@7.4.0/style/Icon'
import Overlay from 'https://esm.sh/ol@7.4.0/Overlay'

function showVerifyModal() {
  if (document.getElementById('verify-modal')) return

  const overlay = document.createElement('div')
  overlay.id = 'verify-modal'
  overlay.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-50'

  overlay.innerHTML = `
    <div class="bg-neutral-900 rounded-lg p-6 max-w-md w-full mx-4">
      <h2 class="text-2xl font-bold bg-gradient-to-r from-violet-600 to-orange-400 text-transparent bg-clip-text">Verification required</h2>
      <p class="text-slate-300 mt-3">You need to complete verification to interact with the map. Please verify to continue.</p>
      <div class="mt-6 flex justify-end gap-2">
        <button id="verify-close" class="px-4 py-2 bg-zinc-800 text-white rounded">Close</button>
        <a href="https://veriff.civitta.com" id="verify-go" class="px-4 py-2 bg-indigo-500 text-white rounded">Verify now</a>
      </div>
    </div>
  `

  document.body.appendChild(overlay)
  document.getElementById('verify-close').addEventListener('click', () => overlay.remove())
}

function initOpenLayers() {
  const el = document.getElementById('map')
  if (!el) return
  if (el._olInit) return

  // Wait until the element has a non-zero height (Tailwind may apply styles later)
  const tryInit = () => {
    const rect = el.getBoundingClientRect()
    if (rect.height < 50) {
      console.log('initOpenLayers: container too small, height=', rect.height)
      setTimeout(tryInit, 150)
      return
    }

    el._olInit = true

    const raster = new TileLayer({ source: new OSM() })
    const view = new View({ center: fromLonLat([11.54, 48.12]), zoom: 13 })

    const map = new Map({ target: el, layers: [raster], view })
    console.log('initOpenLayers: map created', map)

    // overlay for popups
    const container = document.createElement('div')
    container.className = 'bg-neutral-900 text-white p-2 rounded shadow-md'
    container.style.minWidth = '120px'
    container.style.pointerEvents = 'auto'
    const overlay = new Overlay({ element: container, positioning: 'bottom-center', stopEvent: false })
    map.addOverlay(overlay)

    // read pins from data attribute
    let pins = []
    try {
      const raw = el.getAttribute('data-pins')
      if (raw) pins = JSON.parse(raw)
    } catch (e) {
      console.warn('pins parse', e)
    }
    console.log('initOpenLayers: pins count=', pins.length)

    // Make vector source accessible for dynamic updates
    let vectorSource = new VectorSource({ features: [] })
    const vectorLayer = new VectorLayer({ source: vectorSource })
    map.addLayer(vectorLayer)

    // helper: add a pin feature and center/animate optionally
    const addPin = (p, focus = false) => {
      try {
        const f = new Feature({ geometry: new Point(fromLonLat([p.lng, p.lat])), data: p })
        f.setStyle(new Style({ image: new Icon({ src: 'https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/images/marker-icon.png', scale: 1 }) }))
        vectorSource.addFeature(f)
        if (focus) view.animate({ center: fromLonLat([p.lng, p.lat]), zoom: Math.max(view.getZoom(), 13), duration: 600 })
      } catch (e) {
        console.warn('addPin failed', e)
      }
    }

    // initial pins
    const knownPinIds = new Set()
    if (pins && pins.length) {
      pins.forEach((p) => {
        addPin(p)
        knownPinIds.add(p.id)
      })
    }

    map.on('singleclick', function (evt) {
      const coordinate = evt.coordinate
      const feature = map.forEachFeatureAtPixel(evt.pixel, (f) => f)
      if (feature) {
        const d = feature.get('data')
        container.innerHTML = `<strong>${d.title}</strong><div class="text-sm">${d.description}</div>`
        overlay.setPosition(coordinate)
      } else {
        // clicked map background
        const logged = (typeof window !== 'undefined' && window.trapLogged) || localStorage.getItem('trap_logged') === 'true'
        if (!logged) showVerifyModal()
      }
    })

    // --- Notifications & polling for new pins ---
    // Helper: show a browser notification (if permission) or fallback to in-page toast
    const showBrowserNotification = (pin) => {
      const title = `New alert: Detcord Deployment nearby`
      const body = pin.description || ''
      try {
        if (window.Notification && Notification.permission === 'granted') {
          const n = new Notification(title, { body })
          n.onclick = () => {
            window.focus()
            window.location.href = '/map'
          }
        } else if (window.Notification && Notification.permission !== 'denied') {
          Notification.requestPermission().then((perm) => {
            if (perm === 'granted') showBrowserNotification(pin)
          })
        } else {
          showToast(`${title} — ${body}`)
        }
      } catch (e) {
        console.warn('Notification error', e)
        showToast(`${title} — ${body}`)
      }
    }

    // small in-page toast for fallback / visual feedback
    const showToast = (msg, timeout = 6000) => {
      try {
        const existing = document.getElementById('map-toast-container')
        let containerEl = existing
        if (!containerEl) {
          containerEl = document.createElement('div')
          containerEl.id = 'map-toast-container'
          containerEl.style.position = 'fixed'
          containerEl.style.right = '16px'
          containerEl.style.bottom = '16px'
          containerEl.style.zIndex = '99999'
          document.body.appendChild(containerEl)
        }
        const item = document.createElement('div')
        item.className = 'bg-indigo-600 text-white rounded p-3 mb-2 shadow'
        item.style.minWidth = '200px'
        item.innerText = msg
        containerEl.appendChild(item)
        setTimeout(() => item.remove(), timeout)
      } catch (e) {
        /* ignore */
      }
    }

    // handle array of pins: add any new ones and notify
    const handleNewPins = (newPins) => {
      if (!Array.isArray(newPins) || newPins.length === 0) return
      const newlyAdded = []
      newPins.forEach((p) => {
        if (!knownPinIds.has(p.id)) {
          knownPinIds.add(p.id)
          addPin(p, false)
          newlyAdded.push(p)
        }
      })
      if (newlyAdded.length) {
        // show notifications for each new pin
        newlyAdded.forEach((p) => {
          showBrowserNotification(p)
        })
      }
    }

    // polling: try endpoints in order; configurable
    const fetchPinsFromServer = async () => {
      const endpoints = ['/pins.json', '/api/pins', '/api/pins.json']
      for (const ep of endpoints) {
        try {
          const res = await fetch(ep, { cache: 'no-store' })
          if (res.ok) {
            const data = await res.json()
            if (Array.isArray(data)) return data
            // maybe payload is { pins: [...] }
            if (data && Array.isArray(data.pins)) return data.pins
          }
        } catch (e) {
          /* try next */
        }
      }
      return null
    }

    // start polling every 15s; initial delay to avoid spamming
    setTimeout(() => {
      // request permission proactively
      if (window.Notification && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
        Notification.requestPermission().catch(() => {})
      }
      ;(async function poll() {
        try {
          const remote = await fetchPinsFromServer()
          if (remote) handleNewPins(remote)
        } catch (e) {
          console.warn('poll error', e)
        }
        setTimeout(poll, 15000)
      })()
    }, 2000)

    // Expose a helper so the page can trigger permission request and a test notification
    window.requestMapNotifications = async function requestMapNotifications() {
      try {
        if (!('Notification' in window)) {
          showToast('This browser does not support notifications')
          return 'unsupported'
        }
        const current = Notification.permission
        if (current === 'granted') {
          showToast('Notifications already granted')
          showBrowserNotification({ title: 'Test notification', description: 'Notifications are enabled' })
          return 'granted'
        }
        const perm = await Notification.requestPermission()
        showToast(`Notification permission: ${perm}`)
        if (perm === 'granted') showBrowserNotification({ title: 'Test notification', description: 'Notifications are enabled' })
        return perm
      } catch (e) {
        console.warn('requestMapNotifications error', e)
        showToast('Notification request failed')
        return 'error'
      }
    }

    // Expose simulateNewPin so the page can add a pin programmatically (for testing)
    window.simulateNewPin = function simulateNewPin(opts = {}) {
      try {
        // determine next id
        let nextId = 1
        if (knownPinIds.size) {
          const maxId = Math.max(...Array.from(knownPinIds))
          nextId = maxId + 1
        } else {
          nextId = Date.now()
        }

        // pick center of map as base location
        let centerLonLat = [11.54, 48.12]
        try {
          const center = view.getCenter()
          if (center) centerLonLat = toLonLat(center)
        } catch (e) {
          /* ignore */
        }

        // small random jitter
        const jitter = (Math.random() - 0.5) * 0.01
        const lat = (opts.lat || centerLonLat[1]) + jitter
        const lng = (opts.lng || centerLonLat[0]) + jitter

        const pin = { id: nextId, lat, lng, title: opts.title || `Test Pin ${nextId}`, description: opts.description || 'Added via simulateNewPin' }
        knownPinIds.add(pin.id)
        addPin(pin, true)
        showBrowserNotification(pin)
        return pin
      } catch (e) {
        console.warn('simulateNewPin failed', e)
        return null
      }
    }
  }

  // if OpenLayers doesn't successfully render after N attempts, show an iframe fallback
  let attempts = 0
  const maxAttempts = 12
  const waitAndTry = () => {
    attempts += 1
    tryInit()
    // check if a map object was created by checking _olInit and child nodes
    if (!el._olInit && attempts < maxAttempts) {
      setTimeout(waitAndTry, 250)
      return
    }
    if (!el._olInit) {
      console.warn('initOpenLayers: failed to initialize after', attempts, 'attempts — falling back to iframe')
      // fallback: embed an OpenStreetMap iframe centered on first pin (if any)
      let lat = 48.12
      let lng = 11.54
      try {
        const raw = el.getAttribute('data-pins')
        if (raw) {
          const pins = JSON.parse(raw)
          if (pins && pins.length) {
            lat = pins[0].lat
            lng = pins[0].lng
          }
        }
      } catch (e) {
        /* ignore */
      }

      const iframe = document.createElement('iframe')
      iframe.width = '100%'
      iframe.height = el.getBoundingClientRect().height || 480
      iframe.style.border = '0'
      iframe.src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.02}%2C${lat - 0.02}%2C${lng + 0.02}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lng}`
      // clear existing content and insert iframe
      el.innerHTML = ''
      el.appendChild(iframe)
    }
  }

  waitAndTry()
}

if (typeof window !== 'undefined') {
  window.addEventListener('load', initOpenLayers)
  window.addEventListener('DOMContentLoaded', () => setTimeout(initOpenLayers, 50))
}
