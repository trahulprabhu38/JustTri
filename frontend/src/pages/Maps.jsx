import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import { useApi } from '../useApi'
import { Card, Loading, ErrorState, Empty, StatRow } from '../components'
import RouteMap from '../RouteMap'
import { decodePolyline, fmtDur, fmtSportPace, fmtNum, fmtDate, SPORT_META } from '../utils'

export default function Maps() {
  const { data, error, loading } = useApi(() => api.races(), [])
  const [filter, setFilter] = useState('all')
  const [active, setActive] = useState(null)

  const routes = useMemo(() => {
    const list = (data?.races || [])
      .filter((r) => r.polyline)
      .map((r) => ({ ...r, points: decodePolyline(r.polyline) }))
      .filter((r) => r.points.length > 1)
    return list.sort((a, b) => b.date.localeCompare(a.date))
  }, [data])

  if (loading) return <Loading />
  if (error) return <ErrorState error={error} />

  const sportsWithRoutes = [...new Set(routes.map((r) => r.sport))]
  const shown = filter === 'all' ? routes : routes.filter((r) => r.sport === filter)

  if (routes.length === 0) {
    return (
      <Card title="No routes yet" desc="Maps come from your GPS activities on Strava">
        <Empty>
          <div style={{ textAlign: 'center', maxWidth: 400 }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>🗺️</div>
            <p className="muted" style={{ marginBottom: 16 }}>
              No route data found. Re-sync Strava to import maps — GPS activities (outdoor runs and rides)
              include a route; treadmill and pool sessions don’t.
            </p>
            <Link to="/connect" className="btn accent">Go to Strava sync</Link>
          </div>
        </Empty>
      </Card>
    )
  }

  return (
    <>
      <div className="pill-list" style={{ marginBottom: 18 }}>
        <button className={`badge ${filter === 'all' ? 'accent' : 'neutral'}`}
          style={{ cursor: 'pointer', padding: '9px 16px', fontSize: 13.5 }} onClick={() => setFilter('all')}>
          All routes <span style={{ opacity: 0.6, marginLeft: 4 }}>{routes.length}</span>
        </button>
        {sportsWithRoutes.map((s) => {
          const meta = SPORT_META[s] || { icon: '•', label: s }
          const n = routes.filter((r) => r.sport === s).length
          return (
            <button key={s} className={`badge ${filter === s ? 'accent' : 'neutral'}`}
              style={{ cursor: 'pointer', padding: '9px 16px', fontSize: 13.5 }} onClick={() => setFilter(s)}>
              {meta.icon} {meta.label} <span style={{ opacity: 0.6, marginLeft: 4 }}>{n}</span>
            </button>
          )
        })}
      </div>

      <div className="grid grid-3">
        {shown.map((r) => {
          const meta = SPORT_META[r.sport] || { icon: '•', color: '#2f6fed' }
          return (
            <div key={r.id} className="card clickable" onClick={() => setActive(r)} style={{ overflow: 'hidden' }}>
              <RouteMap points={r.points} color={meta.color} height={180} />
              <div className="card-pad" style={{ paddingTop: 14 }}>
                <div className="spread">
                  <span className="badge neutral">{meta.icon} {meta.label}</span>
                  <span className="muted mono" style={{ fontSize: 12 }}>{fmtDate(r.date)}</span>
                </div>
                <div style={{ fontWeight: 600, marginTop: 8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {r.name}
                </div>
                <div className="muted mono" style={{ fontSize: 12, marginTop: 4 }}>
                  {fmtNum(r.distanceKm, r.distanceKm < 2 ? 2 : 1)} km · {fmtDur(r.durationSec)} · {fmtSportPace(r.avgPaceSecKm, r.sport)}
                </div>
                <div className="muted mono" style={{ fontSize: 11.5, marginTop: 3 }}>
                  {[
                    r.avgHr ? `♥ ${fmtNum(r.avgHr)}` : null,
                    r.elevationGain ? `↑ ${fmtNum(r.elevationGain)}m` : null,
                    r.avgPowerW ? `${fmtNum(r.avgPowerW)}W` : null,
                    r.avgCadence ? `${fmtNum(r.avgCadence)}${r.sport === 'cycling' ? 'rpm' : 'spm'}` : null,
                  ].filter(Boolean).join(' · ') || '—'}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="muted" style={{ fontSize: 11, marginTop: 16 }}>
        Maps © OpenStreetMap contributors · tiles by CARTO
      </div>

      {active && <RouteModal route={active} onClose={() => setActive(null)} />}
    </>
  )
}

// Builds the full stat list for a route, deriving speed/elevation-per-km and hiding empty values.
function statRows(r) {
  const speedKmh = r.durationSec > 0 ? r.distanceKm / (r.durationSec / 3600) : 0
  const elevPerKm = r.distanceKm > 0 ? r.elevationGain / r.distanceKm : 0
  const cadLabel = r.sport === 'swimming' ? 'Stroke rate' : 'Cadence'
  const cadUnit = r.sport === 'cycling' ? 'rpm' : 'spm'
  return [
    ['Distance', `${fmtNum(r.distanceKm, r.distanceKm < 2 ? 2 : 1)} km`],
    ['Moving time', fmtDur(r.durationSec)],
    ['Pace', fmtSportPace(r.avgPaceSecKm, r.sport)],
    ['Avg speed', speedKmh ? `${fmtNum(speedKmh, 1)} km/h` : null],
    ['Avg HR', r.avgHr ? `${fmtNum(r.avgHr)} bpm` : null],
    ['Max HR', r.maxHr ? `${fmtNum(r.maxHr)} bpm` : null],
    [cadLabel, r.avgCadence ? `${fmtNum(r.avgCadence)} ${cadUnit}` : null],
    ['Avg power', r.avgPowerW ? `${fmtNum(r.avgPowerW)} W` : null],
    ['Elevation gain', r.elevationGain ? `${fmtNum(r.elevationGain)} m` : null],
    ['Elevation / km', elevPerKm ? `${fmtNum(elevPerKm)} m/km` : null],
    ['Calories', r.calories ? fmtNum(r.calories) : null],
    ['GPS points', r.points ? fmtNum(r.points.length) : null],
  ].filter(([, v]) => v)
}

function RouteModal({ route, onClose }) {
  const meta = SPORT_META[route.sport] || { icon: '•', label: route.sport, color: '#2f6fed' }
  const stravaId = route.id?.startsWith('strava-') ? route.id.slice(7) : null

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 720 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <div className="row" style={{ gap: 8, marginBottom: 4 }}>
              <span className="badge neutral">{meta.icon} {meta.label}</span>
              <span className="muted mono" style={{ fontSize: 12 }}>{fmtDate(route.date)}</span>
            </div>
            <h2 style={{ fontSize: 18 }}>{route.name}</h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <RouteMap points={route.points} color={meta.color} height={360} interactive />
          <div className="detail-grid" style={{ marginTop: 16 }}>
            {statRows(route).map(([k, v]) => <StatRow key={k} k={k} v={v} />)}
          </div>
          {stravaId && (
            <a className="btn ghost" style={{ marginTop: 16 }} href={`https://www.strava.com/activities/${stravaId}`} target="_blank" rel="noreferrer">
              View on Strava ↗
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
