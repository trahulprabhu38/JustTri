import { trendMeta, signed } from './utils'

export function Card({ title, desc, right, children, className = '', pad = true }) {
  return (
    <div className={`card ${className}`}>
      <div className={pad ? 'card-pad' : ''}>
        {(title || right) && (
          <div className="card-head">
            <div>
              {title && <div className="card-title">{title}</div>}
              {desc && <div className="card-desc">{desc}</div>}
            </div>
            {right}
          </div>
        )}
        {children}
      </div>
    </div>
  )
}

export function TrendBadge({ change, pct, lowerIsBetter = false, suffix = '', unit = '' }) {
  const m = trendMeta(change, { lowerIsBetter })
  const label =
    pct !== undefined && pct !== null
      ? `${signed(pct, 1)}%`
      : `${signed(change, unit === 's' ? 0 : 1)}${suffix}`
  return (
    <span className={`badge ${m.cls}`}>
      <span>{m.arrow}</span>
      {label}
      {m.improving === true ? ' better' : m.improving === false ? ' worse' : ''}
    </span>
  )
}

export function Kpi({ label, value, unit, foot }) {
  return (
    <div className="card kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">
        {value}
        {unit && <span className="unit">{unit}</span>}
      </div>
      {foot && <div className="kpi-foot">{foot}</div>}
    </div>
  )
}

export function Loading({ label = 'Loading…' }) {
  return (
    <div className="center-pad">
      <div className="spinner" />
      <div>{label}</div>
    </div>
  )
}

export function ErrorState({ error }) {
  return (
    <div className="center-pad">
      <div style={{ fontSize: 22 }}>⚠️</div>
      <div style={{ color: 'var(--bad)', fontWeight: 600 }}>Couldn’t load data</div>
      <div className="muted" style={{ fontSize: 12 }}>{String(error)}</div>
      <div className="muted" style={{ fontSize: 12 }}>Make sure the Go backend is running on :8080.</div>
    </div>
  )
}

export function StatRow({ k, v }) {
  return (
    <div className="stat-row">
      <span className="k">{k}</span>
      <span className="v">{v}</span>
    </div>
  )
}

export function Empty({ children }) {
  return <div className="center-pad" style={{ padding: 40 }}>{children}</div>
}
