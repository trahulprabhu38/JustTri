import { api } from '../api'
import { useApi } from '../useApi'
import { Card, Kpi, TrendBadge, Loading, ErrorState, StatRow } from '../components'
import { LineTS, AreaTS } from '../charts'
import { fmtDur, fmtNum } from '../utils'

export default function Dashboard() {
  const { data, error, loading } = useApi(
    () => Promise.all([api.overview(), api.racePredictions(), api.readiness(), api.physiology()])
      .then(([overview, rp, readiness, physio]) => ({ overview, rp, readiness, physio })),
    []
  )

  if (loading) return <Loading label="Loading your fitness data…" />
  if (error) return <ErrorState error={error} />

  const { overview: o, rp, readiness, physio } = data
  const acwr = o.trainingLoad
  const acwrCls = acwr.ratio > 1.5 ? 'bad' : acwr.ratio < 0.8 ? 'warn' : 'good'

  return (
    <>
      <div className="section-title">Key metrics · {o.dateRange.start} → {o.dateRange.end}</div>
      <div className="grid grid-4">
        <Kpi
          label="VO₂ Max (Running)"
          value={fmtNum(o.vo2max.latest)}
          unit="ml/kg/min"
          foot={<TrendBadge change={o.vo2max.trend.change} pct={o.vo2max.trend.percentDiff} />}
        />
        <Kpi
          label="Predicted 5K"
          value={fmtDur(o.racePrediction5k.latest)}
          foot={<TrendBadge change={o.racePrediction5k.trend.change} pct={o.racePrediction5k.trend.percentDiff} lowerIsBetter />}
        />
        <Kpi
          label="Training Readiness"
          value={fmtNum(o.readiness.latest)}
          unit="/100"
          foot={<span className="muted">avg over range</span>}
        />
        <Kpi
          label="Acute : Chronic Load"
          value={fmtNum(acwr.ratio, 2)}
          foot={<span className={`badge ${acwrCls}`}>{acwr.acwrStatus || 'n/a'}</span>}
        />
      </div>

      <div className="grid grid-4" style={{ marginTop: 16 }}>
        <Kpi label="HRV (weekly avg)" value={fmtNum(o.hrvWeeklyAvg)} unit="ms" />
        <Kpi label="Resting HR (avg)" value={fmtNum(o.restingHrAvg)} unit="bpm" />
        <Kpi label="Sleep Score (avg)" value={fmtNum(o.sleepScoreAvg)} unit="/100" />
        <Kpi
          label="Fitness Age"
          value={fmtNum(o.fitnessAge.bioAge, 1)}
          unit="yrs"
          foot={
            <span className={`badge ${o.fitnessAge.delta <= 0 ? 'good' : 'bad'}`}>
              {o.fitnessAge.delta <= 0 ? '↓' : '↑'} {Math.abs(o.fitnessAge.delta)} vs age {o.fitnessAge.chronoAge}
            </span>
          }
        />
      </div>

      <div className="section-title">Trends</div>
      <div className="grid grid-2">
        <Card title="Predicted race times" desc="Garmin race-time predictions over the period">
          <LineTS
            data={rp.series}
            valueFmt={fmtDur}
            lines={[
              { key: 'time5k', name: '5K', color: '#2f6fed' },
              { key: 'time10k', name: '10K', color: '#7a4de0' },
              { key: 'timeHalf', name: 'Half', color: '#0e9db6' },
            ]}
          />
        </Card>
        <Card title="Training readiness" desc="Daily readiness score (0–100)">
          <AreaTS data={readiness.series} dataKey="score" name="Readiness" color="#1a9d6b" yDomain={[0, 100]} />
        </Card>
      </div>

      <div className="grid grid-3" style={{ marginTop: 16 }}>
        <Card title="HRV trend" desc="Heart-rate variability (ms)">
          <AreaTS data={physio.physio.filter((p) => p.hrv > 0)} dataKey="hrv" name="HRV" color="#2f6fed" />
        </Card>
        <Card title="Snapshot" desc="Latest physiological baseline">
          <StatRow k="Resting HR" v={`${fmtNum(o.restingHrAvg)} bpm`} />
          <StatRow k="Max HR" v={`${fmtNum(physio.zones.maxHr)} bpm`} />
          <StatRow k="Lactate threshold HR" v={`${fmtNum(physio.zones.lactateThresholdHr)} bpm`} />
          <StatRow k="HRV weekly avg" v={`${fmtNum(o.hrvWeeklyAvg)} ms`} />
          <StatRow k="Sleep score" v={`${fmtNum(o.sleepScoreAvg)}/100`} />
        </Card>
        <Card title="Load balance" desc="Acute vs chronic training load">
          <StatRow k="Acute load (7d)" v={fmtNum(acwr.acute)} />
          <StatRow k="Chronic load (28d)" v={fmtNum(acwr.chronic)} />
          <StatRow k="ACWR ratio" v={fmtNum(acwr.ratio, 2)} />
          <StatRow k="Status" v={<span className={`badge ${acwrCls}`}>{acwr.acwrStatus}</span>} />
          <div className="muted" style={{ fontSize: 12, marginTop: 10 }}>
            Sweet spot is 0.8–1.3. Above 1.5 signals spike risk; below 0.8 suggests detraining.
          </div>
        </Card>
      </div>
    </>
  )
}
