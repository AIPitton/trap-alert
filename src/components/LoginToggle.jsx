import React, { useState, useEffect } from 'react'

export default function LoginToggle() {
  const [logged, setLogged] = useState(() => {
    try {
      return localStorage.getItem('trap_logged') === 'true'
    } catch (e) {
      return false
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem('trap_logged', logged ? 'true' : 'false')
    } catch (e) {}
    // expose quick global for non-React scripts
    try {
      window.trapLogged = logged
    } catch (e) {}
  }, [logged])

  return (
    <button
      onClick={() => {
        setLogged((v) => {
          const newValue = !v
          console.log('Logged state changed to:', newValue)
          return newValue
        })
      }}
      className="bg-indigo-400 hover:bg-indigo-500 text-xl font-semibold text-white px-4 py-2 rounded-xl mt-10 flex items-center gap-2"
      aria-pressed={logged}
    >
      <span className={logged ? 'text-green-500' : 'text-red-500'}>{logged ? 'Logged In' : 'Logged Out'}</span>
    </button>
  )
}
