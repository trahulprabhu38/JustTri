import { useEffect, useRef, useState } from 'react'
import { api } from '../api'
import { useAuth } from '../auth'

// Loads the Google Identity Services script once.
function loadGsi() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve()
    const s = document.createElement('script')
    s.src = 'https://accounts.google.com/gsi/client'
    s.async = true
    s.defer = true
    s.onload = resolve
    s.onerror = () => reject(new Error('Failed to load Google Sign-In'))
    document.body.appendChild(s)
  })
}

export default function Login() {
  const { refresh } = useAuth()
  const btnRef = useRef(null)
  const [error, setError] = useState(null)
  const [notConfigured, setNotConfigured] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { googleClientId } = await api.authConfig()
        if (!googleClientId) { setNotConfigured(true); return }
        await loadGsi()
        if (cancelled) return
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (resp) => {
            try { await api.googleLogin(resp.credential); await refresh() }
            catch (e) { setError(e.message) }
          },
        })
        window.google.accounts.id.renderButton(btnRef.current, {
          theme: 'outline', size: 'large', width: 300, text: 'signin_with', shape: 'pill',
        })
      } catch (e) {
        setError(e.message)
      }
    })()
    return () => { cancelled = true }
  }, [refresh])

  return (
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--bg)' }}>
      <div className="card card-pad" style={{ width: 380, textAlign: 'center', padding: '34px 30px' }}>
        <div className="brand-mark" style={{ margin: '0 auto 16px', width: 40, height: 40, fontSize: 17 }}>TRI</div>
        <h1 style={{ fontSize: 21 }}>Tri</h1>
        <p className="muted" style={{ fontSize: 13, margin: '6px 0 26px' }}>
          Sign in to sync your Garmin & Strava data and track your triathlon progress.
        </p>

        {notConfigured ? (
          <div className="badge warn" style={{ display: 'block', padding: 12, lineHeight: 1.5 }}>
            Google Sign-In isn’t configured. Set <code>GOOGLE_CLIENT_ID</code> on the backend
            (Google Cloud → Credentials → OAuth Web client, with JS origin <code>http://localhost:5173</code>).
          </div>
        ) : (
          <div ref={btnRef} style={{ display: 'flex', justifyContent: 'center' }} />
        )}

        {error && <div className="badge bad" style={{ marginTop: 16 }}>{error}</div>}

        <p className="muted" style={{ fontSize: 11, marginTop: 26 }}>
          We only store your name, email and the data you choose to sync.
        </p>
      </div>
    </div>
  )
}
