import { api } from '../api'
import { useApi } from '../useApi'
import { Card, Kpi, Loading, ErrorState, TrendBadge, StatRow } from '../components'
import { LineTS, AreaTS } from '../charts'
import { fmtNum } from '../utils'

export default function Physiology() {
  const { data, error, loading } = useApi(
    () => Promise.all([api.physiology(), api.vo2max()]).then(([p, v]) => ({ p, v })),
    []
  )
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} />

  const { p, v } = data
  const physio = p.physio
  const daily = p.daily
  const z = p.zones

  const latestHrv = [...physio].reverse().find((x) => x.hrv > 0)?.hrv
  const latestSpo2 = [...physio].reverse().find((x) => x.spo2 > 0)?.spo2
  const latestRhr = [...daily].reverse().find((x) => x.restingHr > 0)?.restingHr
  const zoneNames = ['Z1 Warm-up', 'Z2 Easy', 'Z3 Aerobic', 'Z4 Threshold', 'Z5 Max']

  return (
    <>
      <div className="grid grid-4">
        <Kpi label="VO₂ Max" value={fmtNum(v.trend.last)} unit="ml/kg/min"
          foot={<TrendBadge change={v.trend.change} pct={v.trend.percentDiff} />} />
        <Kpi label="HRV (latest)" value={fmtNum(latestHrv)} unit="ms"
          foot={<TrendBadge change={p.hrvTrend.change} pct={p.hrvTrend.percentDiff} />} />
        <Kpi label="Resting HR" value={fmtNum(latestRhr)} unit="bpm" />
        <Kpi label="SpO₂ (latest)" value={fmtNum(latestSpo2)} unit="%" />
      </div>

      <div className="section-title">VO₂ Max & HRV</div>
      <div className="grid grid-2">
        <Card title="VO₂ Max" desc="Aerobic capacity with 30-day projection">
          <LineTS
            data={[
              ...v.series.map((s) => ({ date: s.date, vo2: s.vo2max })),
              ...(v.forecast || []).map((f) => ({ date: f.date, projected: f.value })),
            ]}
            valueFmt={(x) => fmtNum(x, 1)}
            lines={[
              { key: 'vo2', name: 'VO₂ max', color: '#2f6fed' },
              { key: 'projected', name: 'Projection', color: '#8a93a2', dashed: true },
            ]}
          />
        </Card>
        <Card title="Heart-Rate Variability" desc="Higher and stable HRV signals good recovery">
          <AreaTS data={physio.filter((x) => x.hrv > 0)} dataKey="hrv" name="HRV" color="#7a4de0" />
        </Card>
      </div>

      <div className="section-title">Heart rate, respiration & stress</div>
      <div className="grid grid-2">
        <Card title="Resting heart rate" desc="Lower resting HR generally reflects improving fitness">
          <AreaTS data={daily.filter((d) => d.restingHr > 0)} dataKey="restingHr" name="Resting HR" color="#d64550" />
        </Card>
        <Card title="Respiration & stress" desc="Daily averages">
          <LineTS
            data={daily}
            lines={[
              { key: 'avgRespiration', name: 'Respiration (brpm)', color: '#0e9db6' },
              { key: 'avgStress', name: 'Stress', color: '#c98a12' },
            ]}
          />
        </Card>
      </div>

      <div className="section-title">Activity & body battery</div>
      <div className="grid grid-2">
        <Card title="Daily steps" desc="Movement volume">
          <AreaTS data={daily} dataKey="steps" name="Steps" color="#1a9d6b" />
        </Card>
        <Card title="Body battery" desc="Highest vs lowest daily energy">
          <LineTS
            data={daily}
            lines={[
              { key: 'bodyBatteryHigh', name: 'High', color: '#1a9d6b' },
              { key: 'bodyBatteryLow', name: 'Low', color: '#d64550' },
            ]}
            yDomain={[0, 100]}
          />
        </Card>
      </div>

      <div className="section-title">Training zones & thresholds</div>
      <div className="grid grid-2">
        <Card title="Heart-rate zones" desc="Zone floors used for training targets">
          {z.hrZoneFloors?.map((f, i) => (
            <StatRow key={i} k={zoneNames[i]} v={`${fmtNum(f)}+ bpm`} />
          ))}
        </Card>
        <Card title="Physiological baselines">
          <StatRow k="Max heart rate" v={`${fmtNum(z.maxHr)} bpm`} />
          <StatRow k="Resting heart rate" v={`${fmtNum(z.restingHr)} bpm`} />
          <StatRow k="Lactate threshold HR" v={`${fmtNum(z.lactateThresholdHr)} bpm`} />
          <StatRow k="Lactate threshold pace" v={z.lactateThresholdSpeed ? `${fmtNum(1000 / z.lactateThresholdSpeed / 60, 2)} min/km` : '—'} />
          {z.powerZoneFloors?.length > 0 && (
            <StatRow k="Power zones" v={`${z.powerZoneFloors.length} configured`} />
          )}
        </Card>
      </div>

      <div className="muted" style={{ fontSize: 12, marginTop: 14 }}>
        Cadence and per-workout power appear here once you upload individual run/bike activities on the Race Analysis page.
      </div>
    </>
  )
}
