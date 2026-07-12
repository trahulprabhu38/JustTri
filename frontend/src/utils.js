// Formatting + small analytics helpers used across pages.

// Seconds -> "mm:ss" or "h:mm:ss".
export function fmtDur(sec) {
  if (!sec || sec <= 0) return '—'
  const s = Math.round(sec)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const ss = s % 60
  const pad = (n) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`
}

// Pace seconds/km -> "m:ss /km".
export function fmtPace(secPerKm) {
  if (!secPerKm || secPerKm <= 0) return '—'
  const m = Math.floor(secPerKm / 60)
  const s = Math.round(secPerKm % 60)
  return `${m}:${String(s).padStart(2, '0')} /km`
}

// Swimming pace as "m:ss /100m" from seconds-per-km.
export function fmtSwimPace(secPerKm) {
  if (!secPerKm || secPerKm <= 0) return '—'
  const per100 = secPerKm / 10
  const m = Math.floor(per100 / 60)
  const s = Math.round(per100 % 60)
  return `${m}:${String(s).padStart(2, '0')} /100m`
}

// Sport-aware pace formatter.
export function fmtSportPace(secPerKm, sport) {
  return sport === 'swimming' ? fmtSwimPace(secPerKm) : fmtPace(secPerKm)
}

// Short date "Jun 12".
export function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function fmtNum(n, digits = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—'
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits })
}

export function signed(n, digits = 0) {
  const v = Number(n)
  const s = v > 0 ? '+' : ''
  return s + v.toFixed(digits)
}

// Returns { cls, arrow, label } for a change, respecting whether lower is better.
export function trendMeta(change, { lowerIsBetter = false } = {}) {
  if (Math.abs(change) < 1e-9) return { cls: 'neutral', arrow: '→', improving: null }
  const improving = lowerIsBetter ? change < 0 : change > 0
  return {
    cls: improving ? 'good' : 'bad',
    arrow: change > 0 ? '↑' : '↓',
    improving,
  }
}

// Decodes a Google/Strava encoded polyline into [lat, lng] pairs for Leaflet.
export function decodePolyline(str, precision = 5) {
  if (!str) return []
  let index = 0, lat = 0, lng = 0
  const coords = []
  const factor = Math.pow(10, precision)
  while (index < str.length) {
    let result = 1, shift = 0, b
    do { b = str.charCodeAt(index++) - 63 - 1; result += b << shift; shift += 5 } while (b >= 0x1f)
    lat += result & 1 ? ~(result >> 1) : result >> 1
    result = 1; shift = 0
    do { b = str.charCodeAt(index++) - 63 - 1; result += b << shift; shift += 5 } while (b >= 0x1f)
    lng += result & 1 ? ~(result >> 1) : result >> 1
    coords.push([lat / factor, lng / factor])
  }
  return coords
}

export const SPORT_META = {
  running: { label: 'Running', icon: '🏃', color: '#2f6fed' },
  cycling: { label: 'Cycling', icon: '🚴', color: '#7a4de0' },
  swimming: { label: 'Swimming', icon: '🏊', color: '#0e9db6' },
}
