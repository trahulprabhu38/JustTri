# TriAnalyzer — Garmin Triathlon Performance Lab

A clean, professional analyzer for your Garmin data focused on triathlon (swim · bike · run).
It parses your Garmin export, visualizes month-to-month progress, compares race-to-race
results, forecasts future performance, and generates an AI coaching plan.

- **Frontend:** React (JavaScript) + Vite + Recharts
- **Backend:** Go + Gin (parses the `json/` Garmin export)
- **AI:** OpenAI (ChatGPT) for coaching insights

## Quick start (Docker — recommended)

```bash
# optional: enable the AI Coach without pasting a key in the UI
cp .env.example .env   # then edit OPENAI_API_KEY

docker compose up -d --build
```

Then open **http://localhost:5173**.

- Frontend (nginx): http://localhost:5173
- Backend API: http://localhost:8080/api

Stop with `docker compose down`. Your uploaded races persist in the `tri-uploads` volume.

## Quick start (without Docker)

```bash
# terminal 1 — backend
cd backend
GARMIN_DATA_DIR=../json go run .      # serves :8080

# terminal 2 — frontend
cd frontend
npm install
npm run dev                           # serves :5173, proxies /api to :8080
```

## Pages

| Page | What it shows |
|------|---------------|
| **Dashboard** | Headline KPIs (VO₂ max, predicted 5K, readiness, ACWR, HRV, sleep, fitness age) with trends |
| **Race Analysis** | Toggle swim/bike/run, pick races, **Analyse** to compare + project the next result. Upload new races anytime — old ones stay saved |
| **Race Predictions** | Garmin's 5K/10K/Half/Marathon predictions with month-over-month trend and a 30-day forecast |
| **Physiology** | Dedicated VO₂ max, HRV, resting HR, respiration, stress, body battery, and HR/power zones |
| **Training Load** | Acute vs chronic load, ACWR ratio (with safe-zone guides), and readiness factor breakdown |
| **Sleep & Recovery** | Sleep score, stages, sleeping stress/respiration, and hydration |
| **AI Coach** | Paste an OpenAI key (or set it on the backend) to get a data-grounded analysis + 4-week plan |

## Race data

Your Garmin export contains daily metrics and **predictions**, not individual finished-race
files. On first run the backend seeds a realistic multi-sport race history so the comparison
features work out of the box. To add your own races, use **Add a new race** on the Race
Analysis page — it accepts Garmin/Strava-style activity JSON (distance in m or km, duration in
seconds; sport is auto-detected). Seeded and uploaded races live together and persist.

## Configuration

| Env var | Default | Purpose |
|---------|---------|---------|
| `GARMIN_DATA_DIR` | `../json` (`/data` in Docker) | Where the Garmin export lives |
| `UPLOAD_DIR` | `uploads` (`/app/uploads` in Docker) | Where uploaded races are stored |
| `PORT` | `8080` | Backend port |
| `OPENAI_API_KEY` | — | Enables the AI Coach server-side |
| `OPENAI_MODEL` | `gpt-4o-mini` | OpenAI model for insights |

## API

```
GET  /api/overview            Dashboard KPIs + trends
GET  /api/race-predictions    Predicted times + forecast
GET  /api/vo2max              VO₂ max series + forecast
GET  /api/physiology          HRV, HR, SpO₂, respiration, zones
GET  /api/training-load       Acute/chronic load + ACWR
GET  /api/readiness           Training readiness + factors
GET  /api/sleep               Sleep stages, scores, hydration
GET  /api/races               All races
POST /api/races/analyze       Compare selected race IDs + projection
POST /api/races/upload        Add a race (activity JSON)
POST /api/ai/insights         OpenAI coaching report
```
