import { useState } from 'react'
import { api } from '../api'
import { useApi } from '../useApi'
import { Card, Loading, ErrorState, TrendBadge } from '../components'
import { LineTS } from '../charts'
import { fmtDur, fmtDate } from '../utils'

const DISTANCES = [
  { key: 'time5k', analysis: 'time5k', label: '5K', color: '#2f6fed' },
  { key: 'time10k', analysis: 'time10k', label: '10K', color: '#7a4de0' },
  { key: 'timeHalf', analysis: 'timeHalf', label: 'Half Marathon', color: '#0e9db6' },
  { key: 'timeMarathon', analysis: 'timeMarathon', label: 'Marathon', color: '#c98a12' },
]

export default function RacePredictions() {
  const { data, error, loading } = useApi(() => api.racePredictions(), [])
  const [dist, setDist] = useState(DISTANCES[0])

  if (loading) return <Loading />
  if (error) return <ErrorState error={error} />

  const series = data.series
  const analysis = data.analysis[dist.analysis]
  const forecast = analysis.forecast || []

  // Merge history + forecast so the chart shows a dashed projection.
  const merged = [
    ...series.map((s) => ({ date: s.date, actual: s[dist.key] })),
    ...forecast.map((f) => ({ date: f.date, projected: f.value })),
  ]

  return (
    <>
      <div className="pill-list" style={{ marginBottom: 18 }}>
        {DISTANCES.map((d) => (
          <button
            key={d.key}
            className={`badge ${dist.key === d.key ? 'accent' : 'neutral'}`}
            style={{ cursor: 'pointer', padding: '7px 14px', fontSize: 13 }}
            onClick={() => setDist(d)}
          >
            {d.label}
          </button>
        ))}
      </div>

      <div className="grid grid-4" style={{ marginBottom: 16 }}>
        <Card title="Current prediction">
          <div className="kpi-value">{fmtDur(analysis.trend.last)}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>as of {fmtDate(series.at(-1)?.date)}</div>
        </Card>
        <Card title="Change over period">
          <div style={{ marginTop: 6 }}>
            <TrendBadge change={analysis.trend.change} pct={analysis.trend.percentDiff} lowerIsBetter suffix="s" />
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            {fmtDur(analysis.trend.first)} → {fmtDur(analysis.trend.last)}
          </div>
        </Card>
        <Card title="Daily trajectory">
          <div className="kpi-value" style={{ fontSize: 20 }}>
            {analysis.trend.slopePerDay > 0 ? '+' : ''}{analysis.trend.slopePerDay.toFixed(1)}s
          </div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            per day ({analysis.trend.slopePerDay <= 0 ? 'getting faster' : 'slowing'})
          </div>
        </Card>
        <Card title="30-day projection">
          <div className="kpi-value" style={{ fontSize: 20 }}>{fmtDur(forecast.at(-1)?.value)}</div>
          <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>if the trend holds</div>
        </Card>
      </div>

      <Card title={`${dist.label} prediction & 30-day forecast`} desc="Solid = Garmin history · dashed = linear projection">
        <LineTS
          data={merged}
          valueFmt={fmtDur}
          lines={[
            { key: 'actual', name: 'Predicted time', color: dist.color },
            { key: 'projected', name: 'Projection', color: '#8a93a2', dashed: true },
          ]}
        />
      </Card>

      <div className="section-title">All distances — latest predictions</div>
      <Card pad={false}>
        <table className="tbl">
          <thead>
            <tr>
              <th>Distance</th><th>Start</th><th>Latest</th><th>Change</th><th>Trend</th><th>30-day projection</th>
            </tr>
          </thead>
          <tbody>
            {DISTANCES.map((d) => {
              const a = data.analysis[d.analysis]
              const proj = a.forecast?.at(-1)?.value
              return (
                <tr key={d.key}>
                  <td style={{ fontWeight: 600 }}>{d.label}</td>
                  <td className="mono">{fmtDur(a.trend.first)}</td>
                  <td className="mono">{fmtDur(a.trend.last)}</td>
                  <td className="mono">{a.trend.change > 0 ? '+' : ''}{Math.round(a.trend.change)}s</td>
                  <td><TrendBadge change={a.trend.change} pct={a.trend.percentDiff} lowerIsBetter /></td>
                  <td className="mono">{fmtDur(proj)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
      <div className="muted" style={{ fontSize: 12, marginTop: 12 }}>
        Note: these are Garmin's modeled predictions from your training, not finished races. Upload real races on the
        Race Analysis page to compare actual results.
      </div>
    </>
  )
}
