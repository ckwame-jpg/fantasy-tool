# Fantasy Tool – Deployment

Live Demo: https://fantasy-tool-4gbiq4tuq-chris-prempehs-projects.vercel.app

- Frontend: Next.js on Vercel (builds from repo root `package.json`).
- Backend: FastAPI on Render/Railway (set `NEXT_PUBLIC_API_URL` in Vercel to your backend URL).
- Local dev: `docker compose up --build` from the app root.

Environment variables
- NEXT_PUBLIC_API_URL: https://<your-backend-domain>

Notes
- If previews need CORS, add Vercel preview domain to backend CORS origins.
- Ensure only one lockfile is used during CI/deploy.
