import { useState, useEffect } from 'react'
import ReactMarkdown from 'react-markdown'
import { api } from '../api'
import { Card, Empty } from '../components'

const FOCUS = [
  { key: 'triathlon', label: 'Overall triathlon' },
  { key: '5k', label: '5K speed' },
  { key: '10k', label: '10K' },
  { key: 'half', label: 'Half marathon' },
  { key: 'recovery', label: 'Recovery & readiness' },
]

const KEY_STORE = 'openai_api_key'

export default function AICoach() {
  const [apiKey, setApiKey] = useState('')
  const [focus, setFocus] = useState('triathlon')
  const [goal, setGoal] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)
  const [result, setResult] = useState(null)

  useEffect(() => {
    const saved = localStorage.getItem(KEY_STORE)
    if (saved) setApiKey(saved)
  }, [])

  async function generate() {
    setBusy(true)
    setError(null)
    setResult(null)
    if (apiKey) localStorage.setItem(KEY_STORE, apiKey)
    try {
      const res = await api.aiInsights({ apiKey, focus, goal })
      setResult(res)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="grid grid-2" style={{ alignItems: 'start' }}>
      <Card title="AI Coach" desc="Generates a data-driven analysis and 4-week plan from your metrics">
        <label className="field" style={{ marginTop: 8 }}>OpenAI API key</label>
        <input
          className="input"
          type="password"
          placeholder="sk-…  (stored only in this browser)"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
        />
        <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>
          Or set <code>OPENAI_API_KEY</code> on the backend and leave this blank.
        </div>

        <label className="field" style={{ marginTop: 16 }}>Focus</label>
        <div className="pill-list">
          {FOCUS.map((f) => (
            <button
              key={f.key}
              className={`badge ${focus === f.key ? 'accent' : 'neutral'}`}
              style={{ cursor: 'pointer', padding: '7px 12px', fontSize: 12.5 }}
              onClick={() => setFocus(f.key)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <label className="field" style={{ marginTop: 16 }}>Your goal (optional)</label>
        <textarea
          className="input"
          rows={3}
          placeholder="e.g. Break 25:00 in the 5K and finish a sprint triathlon in September"
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
        />

        <div style={{ marginTop: 14 }}>
          <button className="btn accent" disabled={busy} onClick={generate}>
            {busy ? 'Analyzing…' : '✨ Generate plan'}
          </button>
        </div>
        {error && <div className="badge bad" style={{ marginTop: 12 }}>{error}</div>}
      </Card>

      <Card title="Coaching report" desc={result ? `Generated with ${result.model}` : 'Your personalized analysis will appear here'}>
        {busy && <Empty><div className="spinner" /><span className="muted" style={{ marginTop: 10 }}>Reading your Garmin data…</span></Empty>}
        {!busy && !result && (
          <Empty>
            <span className="muted" style={{ textAlign: 'center', maxWidth: 320 }}>
              Add your OpenAI key, pick a focus, and generate a coaching report grounded in your VO₂ max, HRV,
              training load, sleep and race predictions.
            </span>
          </Empty>
        )}
        {result && (
          <div className="markdown">
            <ReactMarkdown>{result.insight}</ReactMarkdown>
          </div>
        )}
      </Card>
    </div>
  )
}
