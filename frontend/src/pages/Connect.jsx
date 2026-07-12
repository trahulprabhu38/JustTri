import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useApi } from '../useApi'
import { Card, Loading, ErrorState, StatRow } from '../components'

export default function Connect() {
  const { data, error, loading, reload } = useApi(() => api.stravaStatus(), [])
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState(null)

  const justConnected = new URLSearchParams(window.location.search).get('strava') === 'connected'

  if (loading) return <Loading />
  if (error) return <ErrorState error={error} />

  async function connect() {
    setBusy(true); setMsg(null)
    try {
      const { url } = await api.stravaAuthUrl()
      window.location.href = url
    } catch (e) {
      setMsg({ type: 'err', text: e.message }); setBusy(false)
    }
  }
  async function sync() {
    setBusy(true); setMsg(null)
    try {
      const r = await api.stravaSync()
      setMsg({ type: 'ok', text: `Synced ${r.imported} activities (${r.skipped} non-triathlon skipped).` })
    } catch (e) {
      setMsg({ type: 'err', text: e.message })
    } finally { setBusy(false) }
  }
  async function disconnect() {
    setBusy(true); setMsg(null)
    try { await api.stravaDisconnect(); reload() } finally { setBusy(false) }
  }

  return (
    <div className="grid grid-2" style={{ alignItems: 'start' }}>
      <Card title="Strava" desc="Your Garmin watch pushes to Strava — connect once and sync your runs, rides and swims">
        <div className="row" style={{ margin: '10px 0 16px' }}>
          <span className={`badge ${data.connected ? 'good' : 'neutral'}`}>
            {data.connected ? '● Connected' : '○ Not connected'}
          </span>
          {!data.configured && <span className="badge warn">Backend keys missing</span>}
        </div>

        {(justConnected || msg?.type === 'ok') && (
          <div className="badge good" style={{ marginBottom: 12 }}>{msg?.text || 'Strava connected!'}</div>
        )}
        {msg?.type === 'err' && <div className="badge bad" style={{ marginBottom: 12 }}>{msg.text}</div>}

        {data.connected ? (
          <>
            <StatRow k="Athlete" v={data.athlete || '—'} />
            <div className="row" style={{ marginTop: 16 }}>
              <button className="btn accent" disabled={busy} onClick={sync}>
                {busy ? 'Syncing…' : '↻ Sync activities'}
              </button>
              <button className="btn ghost" disabled={busy} onClick={disconnect}>Disconnect</button>
            </div>
            <div className="muted" style={{ fontSize: 12, marginTop: 12 }}>
              Sync pulls your recent activities and turns runs/rides/swims into comparable races on the Race Analysis page.
            </div>
          </>
        ) : (
          <button className="btn accent" disabled={busy || !data.configured} onClick={connect}>
            {busy ? 'Redirecting…' : 'Connect with Strava'}
          </button>
        )}
      </Card>

      <Card title="Manage your keys" desc="Your Strava API keys are saved to your account">
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.7 }}>
          Your Client ID and Secret were saved during setup and are stored with your account, so you
          stay connected across sessions. To update them or reconnect, revisit the setup flow.
        </p>
        <Link to="/onboarding" className="btn ghost" style={{ marginTop: 14 }}>Edit Strava keys</Link>
        <div className="muted" style={{ fontSize: 12, marginTop: 16 }}>
          Tokens are stored server-side per user and never shared.
        </div>
      </Card>
    </div>
  )
}
