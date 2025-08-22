---
applyTo: '**'
---
Provide project context and coding guidelines that AI should follow when generating code, answering questions, or reviewing changes.

## Deployment Checklist (Always Apply)

- **Frontend hosting:** Always ensure the Next.js frontend can be deployed on **Vercel** with zero config.  
- **Backend hosting:** Always ensure the backend is deployable on **Render or Railway**. Include Procfile/Dockerfile as needed.  
- **Local development:** Always support a one-command local setup using **Docker Compose** (frontend + backend + database).  
- **Browser development:** Always support **GitHub Codespaces** with a devcontainer.json for instant setup.  
- **README updates:** Keep README instructions updated to include steps for Vercel, Render/Railway, Docker Compose, and Codespaces.  
- **Consistency:** Any new changes to environment variables, ports, or configs must work across **all four environments** (Vercel, Render/Railway, Docker, Codespaces).  