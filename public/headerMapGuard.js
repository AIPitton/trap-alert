function showVerifyModal() {
  if (document.getElementById('verify-modal')) return

  const overlay = document.createElement('div')
  overlay.id = 'verify-modal'
  overlay.className = 'fixed inset-0 bg-black/60 flex items-center justify-center z-50'

  overlay.innerHTML = `
    <div class="bg-neutral-900 rounded-lg p-6 max-w-md w-full mx-4">
      <h2 class="text-2xl font-bold bg-gradient-to-r from-violet-600 to-orange-400 text-transparent bg-clip-text">Verification required</h2>
      <p class="text-slate-300 mt-3">You need to complete verification to access the Map. Please verify to continue.</p>
      <div class="mt-6 flex justify-end gap-2">
        <button id="verify-close" class="px-4 py-2 bg-zinc-800 text-white rounded">Close</button>
        <a href="/" id="verify-go" class="px-4 py-2 bg-indigo-500 text-white rounded">Verify now</a>
      </div>
    </div>
  `

  document.body.appendChild(overlay)

  document.getElementById('verify-close').addEventListener('click', () => {
    overlay.remove()
  })
}

function initGuard() {
  document.addEventListener(
    'click',
    function (e) {
      const target = e.target.closest && e.target.closest('a[href]')
      if (!target) return
      const href = target.getAttribute('href')
      if (!href) return
      // only guard internal /map link
      if (href === '/map' || href.startsWith('/map#')) {
        const logged = (typeof window !== 'undefined' && window.trapLogged) || localStorage.getItem('trap_logged') === 'true'
        if (!logged) {
          e.preventDefault()
          showVerifyModal()
        }
      }
    },
    { capture: true },
  )
}

if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', initGuard)
}
