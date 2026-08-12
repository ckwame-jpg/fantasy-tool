# Only W's Fantasy

A full-stack fantasy football toolkit built with Next.js and FastAPI. Connect your Sleeper league to get personalized roster analysis, or use it standalone with league-wide NFL data.

**[Live Demo](https://fantasy-tool-chris-prempehs-projects.vercel.app)**

## Features

- **Draftboard** — Mock draft with ADP rankings, positional tiers, and team builder
- **Players** — Browse all NFL players with stats, projections, sortable columns, and favorites
- **Trade Analyzer** — VORP-based trade calculator with contender/rebuilder modes, dynasty pick values, Sleeper trending data, and projected lineup impact
- **Waiver Wire** — Find available players ranked by priority with roster-aware filtering
- **Lineup Optimizer** — Optimize your weekly lineup with projected, ceiling, and floor strategies across configurable roster slots
- **Draft Recap** — Post-draft analysis with grades, bye week distribution, and starting lineup projection
- **Sleeper Integration** — Connect your league to sync rosters, scoring settings, and roster construction

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** FastAPI, httpx, python-socketio (ASGI)
- **APIs:** Sleeper (league data, player stats, trending), FantasyFootballCalculator (ADP fallback)

## Project Structure

```text
├── app/                  # Next.js App Router pages
├── components/           # React components (TradeAnalyzer, LineupOptimizer, etc.)
├── lib/                  # Utilities (trade-values, roster-utils, league-context)
├── backend/              # FastAPI app (API routes, Sleeper proxy, caching)
│   └── app/api/routes.py # All API endpoints
├── types/                # Shared TypeScript types
└── constants.ts          # API base URL config
```

## Getting Started

### Prerequisites
- Node.js 20+
- Python 3.11+

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8004
```

### Frontend

```bash
npm install
npm run dev
```

The frontend runs on `http://localhost:3000` and expects the backend at `http://localhost:8004`.

## Deployment

- **Frontend:** Vercel — set `NEXT_PUBLIC_API_URL` to your backend URL
- **Backend:** Render/Railway/Fly.io — set `CORS_ORIGINS` to your frontend domain

## License

MIT
