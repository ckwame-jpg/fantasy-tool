# W fantasy

A full‑stack fantasy football toolkit with a Next.js frontend and FastAPI backend. It includes a Draftboard, Players explorer with sticky headers and precise column alignment, favorites with localStorage persistence, and utilities for lineup optimization, trades, and waiver wire exploration.

Live Demo: https://fantasy-tool-4gbiq4tuq-chris-prempehs-projects.vercel.app

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
- Next.js app at repo root (App Router)
- `backend/` — FastAPI app (API + Socket.IO)
- `INTEGRATION_GUIDE.md` — integration notes

## Quickstart
### Prerequisites
- Node.js 20+
- Python 3.11+

### Docker Compose (Local, one command)
Run both backend and frontend with hot reload:

1. Ensure Docker is running
2. From repo root:
   - Start services: `docker compose up --build`
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8004

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
- Frontend: Vercel recommended. Set `NEXT_PUBLIC_API_URL` to your backend URL. A `vercel.json` at the repo root configures Vercel to build the Next.js app in `frontend/`.
- Backend: Render/Railway/Fly.io/EC2. Ensure CORS allows your frontend origin.

### Render (Backend)
- Repo has `render.yaml` that deploys the FastAPI backend in `backend/` with Uvicorn.
- Set env var `CORS_ORIGINS` to your Vercel domain, e.g. `https://your-app.vercel.app`.

### Railway (Backend)
- Tip: Railway automatically provides `$PORT`. No change to code is needed.

### GitHub Codespaces
- Repo includes `.devcontainer/devcontainer.json` for instant setup.
- Open in Codespaces → it preinstalls Node and Python and starts both services via Docker Compose.
- Ports auto-forward: 3000 (frontend), 8004 (backend).
- Repo has `backend/railway.json`. Create a Railway project from this repo and point the service at `backend/`.
- Defaults: Nixpacks builder, install `requirements.txt`, start `uvicorn main:app --host 0.0.0.0 --port $PORT`.
- Set env var `CORS_ORIGINS` to your Vercel domain, e.g. `https://your-app.vercel.app`.

## CI
A GitHub Actions workflow runs lint, typecheck, and build for the frontend and installs backend requirements. See `.github/workflows/ci.yml`.

## License
MIT - see `LICENSE`.

## Notes
- Favorites are stored client‑side under `fantasy:favorites` and update instantly on toggle.
- Backend caches player responses per season for 5 minutes to reduce API calls.
