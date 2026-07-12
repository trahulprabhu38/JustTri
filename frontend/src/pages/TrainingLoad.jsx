import { api } from '../api'
import { useApi } from '../useApi'
import { Card, Kpi, Loading, ErrorState, StatRow } from '../components'
import { LineTS, AreaTS } from '../charts'
import { fmtNum, fmtDate } from '../utils'

export default function TrainingLoad() {
  const { data, error, loading } = useApi(
    () => Promise.all([api.trainingLoad(), api.readiness()]).then(([tl, r]) => ({ tl, r })),
    []
  )
  if (loading) return <Loading />
  if (error) return <ErrorState error={error} />

  const load = data.tl.series
  const readiness = data.r.series
  const last = load.at(-1) || {}
  const acwrCls = last.ratio > 1.5 ? 'bad' : last.ratio < 0.8 ? 'warn' : 'good'

  // Readiness factor breakdown for the most recent day.
  const lastR = readiness.at(-1) || {}
  const factors = [
    { k: 'Sleep', v: lastR.sleepFactor },
    { k: 'Recovery time', v: lastR.recoveryFactor },
    { k: 'Load (ACWR)', v: lastR.acwrFactor },
    { k: 'Stress history', v: lastR.stressFactor },
    { k: 'HRV', v: lastR.hrvFactor },
    { k: 'Sleep history', v: lastR.sleepHistoryFactor },
  ]

  return (
    <>
      <div className="grid grid-4">
        <Kpi label="Acute load (7-day)" value={fmtNum(last.acute)} />
        <Kpi label="Chronic load (28-day)" value={fmtNum(last.chronic)} />
        <Kpi label="ACWR ratio" value={fmtNum(last.ratio, 2)}
          foot={<span className={`badge ${acwrCls}`}>{last.acwrStatus}</span>} />
        <Kpi label="Latest readiness" value={fmtNum(lastR.score)} unit="/100"
          foot={<span className="badge neutral">{(lastR.level || '').replace(/_/g, ' ') || '—'}</span>} />
      </div>

      <div className="section-title">Load balance</div>
      <Card title="Acute vs chronic training load" desc="When acute (short-term) rises well above chronic (fitness base), injury risk climbs">
        <LineTS
          data={load}
          lines={[
            { key: 'acute', name: 'Acute (7d)', color: '#2f6fed' },
            { key: 'chronic', name: 'Chronic (28d)', color: '#8a93a2' },
          ]}
        />
      </Card>

      <div className="grid grid-2" style={{ marginTop: 16 }}>
        <Card title="ACWR ratio" desc="Green zone 0.8–1.3 balances fitness gains and injury risk">
          <LineTS
            data={load}
            valueFmt={(x) => fmtNum(x, 2)}
            lines={[{ key: 'ratio', name: 'ACWR', color: '#7a4de0' }]}
            refLines={[
              { y: 1.3, color: '#c98a12', label: '1.3' },
              { y: 0.8, color: '#c98a12', label: '0.8' },
            ]}
          />
        </Card>
        <Card title="Training readiness" desc="Composite recovery score (0–100)">
          <AreaTS data={readiness} dataKey="score" name="Readiness" color="#1a9d6b" yDomain={[0, 100]} />
        </Card>
      </div>

      <div className="section-title">What’s driving today’s readiness</div>
      <div className="grid grid-2">
        <Card title={`Factor breakdown · ${fmtDate(lastR.date)}`} desc="Each factor's contribution to the readiness score">
          {factors.map((f) => (
            <StatRow key={f.k} k={f.k} v={`${fmtNum(f.v)}%`} />
          ))}
        </Card>
        <Card title="Recovery" desc="Time your watch recommends before the next hard effort">
          <div className="kpi-value">{fmtNum(lastR.recoveryTimeHours, 1)}<span className="unit">hours</span></div>
          <div className="muted" style={{ fontSize: 13, marginTop: 10 }}>
            {lastR.feedbackShort ? lastR.feedbackShort.replace(/_/g, ' ').toLowerCase() : 'No feedback available.'}
          </div>
          <StatRow k="HRV weekly average" v={`${fmtNum(lastR.hrvWeeklyAvg)} ms`} />
        </Card>
      </div>
    </>
  )
}
