# Fantasy Toolio

A full‑stack fantasy football toolkit with a Next.js frontend and FastAPI backend. It includes a Draftboard, Players explorer with sticky headers and precise column alignment, favorites with localStorage persistence, and utilities for lineup optimization, trades, and waiver wire exploration.

## Features
- Players page with:
  - Pixel‑perfect sticky table headers and aligned columns
  - Favorites toggle that filters to favorited players only
  - Favorites persisted in localStorage under `fantasy:favorites` with legacy key migration
  - Sorting by fantasy points, rushing/receiving/passing stats, and ADP
- Draftboard layout aligned with Players for consistency
- Backend aggregation of Sleeper stats and ADP (with FantasyFootballCalculator fallback)
- Per‑season caching on the backend for faster reloads

## Tech stack
- Frontend: Next.js 15, React 19, TypeScript, Tailwind CSS
- Backend: FastAPI, python-socketio (ASGI), httpx

## Monorepo layout
- `frontend/` — Next.js app (UI)
- `backend/` — FastAPI app (API + Socket.IO)
- `INTEGRATION_GUIDE.md` — integration notes

## Quickstart
### Prerequisites
- Node.js 20+
- Python 3.11+

### Backend
1. Copy env example and install deps:
   - Copy `backend/.env.example` to `backend/.env` (optional)
   - Install deps: `pip install -r backend/requirements.txt`
2. Run the API (port 8004 recommended):
   - `uvicorn backend.main:app --reload --port 8004`

### Frontend
1. Copy env example and install deps:
   - Copy `frontend/.env.example` to `frontend/.env.local`
   - Install deps: `npm install`
2. Run the app:
   - `npm run dev`
3. Configure API URL:
   - Set `NEXT_PUBLIC_API_URL` in `frontend/.env.local` (default fallback is `http://localhost:8004` if unset or invalid)

## Deployment
- Frontend: Vercel recommended. Set `NEXT_PUBLIC_API_URL` to your backend URL.
- Backend: Render/Railway/Fly.io/EC2. Ensure CORS allows your frontend origin.

## CI
A GitHub Actions workflow runs lint, typecheck, and build for the frontend and installs backend requirements. See `.github/workflows/ci.yml`.

## License
MIT - see `LICENSE`.

## Notes
- Favorites are stored client‑side under `fantasy:favorites` and update instantly on toggle.
- Backend caches player responses per season for 5 minutes to reduce API calls.
