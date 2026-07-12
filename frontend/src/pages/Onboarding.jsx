import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { useAuth } from '../auth'
import { Card, StatRow } from '../components'

export default function Onboarding() {
  const { user, stravaConfigured, stravaConnected, refresh, logout } = useAuth()
  const navigate = useNavigate()
  const [clientId, setClientId] = useState('')
  const [clientSecret, setClientSecret] = useState('')
  const [hasSecret, setHasSecret] = useState(false)
  const [busy, setBusy] = useState('')
  const [msg, setMsg] = useState(null)

  useEffect(() => {
    api.stravaCredentials().then((c) => { setClientId(c.clientId || ''); setHasSecret(c.hasSecret) }).catch(() => {})
  }, [])

  async function saveCreds() {
    if (!clientId.trim() || !clientSecret.trim()) { setMsg({ type: 'err', text: 'Enter both Client ID and Secret.' }); return }
    setBusy('save'); setMsg(null)
    try {
      await api.saveStravaCredentials(clientId.trim(), clientSecret.trim())
      setHasSecret(true); setClientSecret('')
      setMsg({ type: 'ok', text: 'Strava keys saved.' })
      await refresh()
    } catch (e) { setMsg({ type: 'err', text: e.message }) }
    finally { setBusy('') }
  }

  async function connect() {
    setBusy('connect'); setMsg(null)
    try { const { url } = await api.stravaAuthUrl(); window.location.href = url }
    catch (e) { setMsg({ type: 'err', text: e.message }); setBusy('') }
  }

  async function sync() {
    setBusy('sync'); setMsg(null)
    try {
      const r = await api.stravaSync()
      setMsg({ type: 'ok', text: `Synced ${r.imported} activities.` })
      await refresh()
    } catch (e) { setMsg({ type: 'err', text: e.message }) }
    finally { setBusy('') }
  }

  const Step = ({ n, done, title, children }) => (
    <div className="card card-pad" style={{ marginBottom: 14, borderLeft: `3px solid ${done ? 'var(--good)' : 'var(--border-strong)'}` }}>
      <div className="row" style={{ marginBottom: 10 }}>
        <span className="badge" style={{ background: done ? 'var(--good-soft)' : 'var(--surface-2)', color: done ? 'var(--good)' : 'var(--text-2)', minWidth: 24, justifyContent: 'center' }}>
          {done ? '✓' : n}
        </span>
        <strong>{title}</strong>
      </div>
      {children}
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '40px 20px' }}>
      <div style={{ maxWidth: 620, margin: '0 auto' }}>
        <div className="spread" style={{ marginBottom: 8 }}>
          <div className="row">
            {user?.picture && <img src={user.picture} alt="" style={{ width: 34, height: 34, borderRadius: '50%' }} />}
            <div>
              <div style={{ fontWeight: 600 }}>Welcome, {user?.name?.split(' ')[0] || 'athlete'} 👋</div>
              <div className="muted" style={{ fontSize: 12 }}>{user?.email}</div>
            </div>
          </div>
          <button className="btn ghost" onClick={logout}>Sign out</button>
        </div>
        <h1 style={{ fontSize: 22, margin: '18px 0 4px' }}>Set up your data</h1>
        <p className="muted" style={{ fontSize: 13, marginBottom: 22 }}>
          Connect Strava with your own API keys. We save them to your account, so you only do this once.
        </p>

        <Step n={1} done={stravaConfigured} title="Add your Strava API keys">
          <p className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>
            Create an app at <code>strava.com/settings/api</code> (Authorization Callback Domain = <code>localhost</code>),
            then paste your keys below.
          </p>
          <label className="field">Client ID</label>
          <input className="input" value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="e.g. 167823" />
          <label className="field" style={{ marginTop: 12 }}>Client Secret {hasSecret && <span className="muted">(saved — leave blank to keep)</span>}</label>
          <input className="input" type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} placeholder={hasSecret ? '••••••••••••' : '40-character secret'} />
          <button className="btn accent" style={{ marginTop: 14 }} disabled={busy === 'save'} onClick={saveCreds}>
            {busy === 'save' ? 'Saving…' : stravaConfigured ? 'Update keys' : 'Save keys'}
          </button>
        </Step>

        <Step n={2} done={stravaConnected} title="Connect your Strava account">
          {!stravaConfigured ? (
            <p className="muted" style={{ fontSize: 12.5 }}>Save your keys first.</p>
          ) : stravaConnected ? (
            <StatRow k="Status" v={<span className="badge good">● Connected</span>} />
          ) : (
            <>
              <p className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>Authorize Tri to read your activities.</p>
              <button className="btn accent" disabled={busy === 'connect'} onClick={connect}>
                {busy === 'connect' ? 'Redirecting…' : 'Connect with Strava'}
              </button>
            </>
          )}
        </Step>

        <Step n={3} done={false} title="Sync your activities">
          <p className="muted" style={{ fontSize: 12.5, marginBottom: 12 }}>Pull your runs, rides and swims. You can re-sync anytime.</p>
          <button className="btn" disabled={!stravaConnected || busy === 'sync'} onClick={sync}>
            {busy === 'sync' ? 'Syncing…' : '↻ Sync now'}
          </button>
        </Step>

        {msg && <div className={`badge ${msg.type === 'ok' ? 'good' : 'bad'}`} style={{ display: 'block', padding: 12, marginBottom: 14 }}>{msg.text}</div>}

        <button className="btn accent" style={{ width: '100%', justifyContent: 'center', padding: 12 }}
          disabled={!stravaConfigured} onClick={() => navigate('/')}>
          {stravaConfigured ? 'Continue to dashboard →' : 'Add your keys to continue'}
        </button>
      </div>
    </div>
  )
}
