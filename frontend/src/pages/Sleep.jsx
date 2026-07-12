import { api } from '../api'
import { useApi } from '../useApi'
import { Card, Kpi, Loading, ErrorState, StatRow } from '../components'
import { AreaTS, BarTS, LineTS } from '../charts'
import { fmtNum } from '../utils'

export default function Sleep() {
  const { data, error, loading } = useApi(() => api.sleep(), [])
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} />

  const nights = data.series
  const last = nights.at(-1) || {}
  const avg = (key) => fmtNum(nights.reduce((s, n) => s + (n[key] || 0), 0) / (nights.length || 1))

  return (
    <>
      <div className="grid grid-4">
        <Kpi label="Avg sleep score" value={fmtNum(data.avgScore)} unit="/100" />
        <Kpi label="Avg total sleep" value={fmtNum(avg('totalMinutes') / 60, 1)} unit="hrs" />
        <Kpi label="Avg deep sleep" value={avg('deepMinutes')} unit="min" />
        <Kpi label="Avg REM" value={avg('remMinutes')} unit="min" />
      </div>

      <div className="section-title">Sleep quality</div>
      <div className="grid grid-2">
        <Card title="Sleep score" desc="Nightly overall score (0–100)">
          <AreaTS data={nights.filter((n) => n.overallScore > 0)} dataKey="overallScore" name="Score" color="#2f6fed" yDomain={[0, 100]} />
        </Card>
        <Card title="Sleep stages" desc="Deep, light and REM minutes per night">
          <BarTS
            data={nights}
            bars={[
              { key: 'deepMinutes', name: 'Deep', color: '#1f3a8a' },
              { key: 'remMinutes', name: 'REM', color: '#2f6fed' },
              { key: 'lightMinutes', name: 'Light', color: '#a9c3f5' },
              { key: 'awakeMinutes', name: 'Awake', color: '#e6e8ec' },
            ]}
          />
        </Card>
      </div>

      <div className="section-title">Recovery signals & hydration</div>
      <div className="grid grid-2">
        <Card title="Sleep stress & respiration" desc="Lower sleeping stress means deeper recovery">
          <LineTS
            data={nights}
            lines={[
              { key: 'avgStress', name: 'Sleep stress', color: '#c98a12' },
              { key: 'avgRespiration', name: 'Respiration', color: '#0e9db6' },
            ]}
          />
        </Card>
        <Card title="Hydration" desc="Daily fluid intake vs estimated sweat loss (ml)">
          <BarTS
            data={data.hydration}
            stacked={false}
            bars={[
              { key: 'intakeMl', name: 'Intake', color: '#0e9db6' },
              { key: 'sweatLossMl', name: 'Sweat loss', color: '#d64550' },
            ]}
          />
        </Card>
      </div>

      <div className="section-title">Most recent night</div>
      <Card>
        <div className="grid grid-3">
          <div>
            <StatRow k="Date" v={last.date} />
            <StatRow k="Overall score" v={`${fmtNum(last.overallScore)}/100`} />
            <StatRow k="Total sleep" v={`${fmtNum(last.totalMinutes / 60, 1)} hrs`} />
          </div>
          <div>
            <StatRow k="Deep" v={`${fmtNum(last.deepMinutes)} min`} />
            <StatRow k="REM" v={`${fmtNum(last.remMinutes)} min`} />
            <StatRow k="Light" v={`${fmtNum(last.lightMinutes)} min`} />
          </div>
          <div>
            <StatRow k="Avg SpO₂" v={`${fmtNum(last.avgSpo2)}%`} />
            <StatRow k="Respiration" v={`${fmtNum(last.avgRespiration, 1)} brpm`} />
            <StatRow k="Sleep stress" v={fmtNum(last.avgStress, 1)} />
          </div>
        </div>
      </Card>
    </>
  )
}
