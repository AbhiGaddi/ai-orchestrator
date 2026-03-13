# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-phase AI pipeline: **Discussion → Tasks → GitHub Issue → Email → Code → Build → Deploy**

- **Phase 1** (live): Discussion extraction → Task approval → TicketAgent → EmailAgent
- **Phase 2** (live): CodeAgent → PR creation/review
- **Phase 3** (stub): BuildAgent → Docker image
- **Phase 4** (stub): DeployAgent → Kubernetes

## Commands

### Frontend (Next.js)
```bash
cd frontend
npm run dev        # Dev server on :3000
npm run build      # Production build
npm run lint       # ESLint
```

### Backend (FastAPI)
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload   # API on :8000
```

API docs: http://localhost:8000/docs

### Docker (full stack)
```bash
cp .env.example .env   # Fill in values first
docker compose up --build
```

### Database Migrations
```bash
cd backend
alembic upgrade head         # Apply migrations
alembic revision --autogenerate -m "description"  # New migration
```

## Architecture

### Backend (`backend/`)

- **`main.py`** — FastAPI app, CORS config (localhost:3000/3001), lifespan startup (DB init + scheduler)
- **`config.py`** — Pydantic `BaseSettings`; single source of truth for all env vars
- **`agents/`** — One file per agent, all inherit from `base_agent.py`. Agents call services directly and log steps to `AgentRun`/`AgentRunStep` models
- **`api/`** — FastAPI routers: `discussion.py`, `approval.py`, `execution.py`, `agent_runs.py`, `projects.py`
- **`services/`** — Pure API wrappers (no business logic): `gemini_service.py`, `github_service.py`/`github_client_v2.py`, `mailer_service.py`, `sonar_service.py`
- **`core/orchestrator.py`** — Pipeline coordinator (`ContextEngine`); chains agents together for a task
- **`core/scheduler.py`** — APScheduler background jobs
- **`db/models.py`** — SQLAlchemy async models: `Task`, `AgentRun`, `AgentRunStep`, `Project`
- **`schemas/`** — Pydantic DTOs for request/response validation

### Frontend (`frontend/src/`)

- **`lib/api.ts`** — All API calls centralized. Uses `fetchApi<T>()` wrapper with `NEXT_PUBLIC_API_URL` (default: http://localhost:8000)
- **`types/index.ts`** — All TypeScript interfaces. Key types: `Task`, `Project`, `AgentRun`, `AgentRunStep`, `TaskStatus`, `Priority`
- **`app/`** — Next.js App Router pages: `/` (home), `/extract`, `/tasks`, `/tasks/[id]`, `/dashboard`, `/projects`, `/projects/[id]`
- **`components/ui/`** — shadcn/ui components (New York style)
- **`app/globals.css`** — All design tokens as CSS variables

### API Flow (Phase 1)

```
POST /api/discussion/extract   → extract tasks from transcript
GET  /api/tasks                → list/filter tasks
PATCH /api/tasks/{id}          → edit task
PATCH /api/tasks/{id}/approve  → approve with optional edits
POST /api/execution/{id}/execute → trigger pipeline
GET  /api/agent-runs           → poll dashboard logs
```

## Design System

- **Fonts**: `Plus Jakarta Sans` (body), `JetBrains Mono` (code/metrics)
- **Theme**: Dark/light toggle via `data-theme` attribute; CSS variables in `globals.css`
- **Accent**: `#a855f7` (violet primary)
- **Backgrounds**: `--bg-base: #111827`, `--bg-card: #1f2937`
- **State colors**: Green `#10b981` (success), Sky `#0ea5e9` (running/active), Yellow `#f59e0b` (warning), Red `#ef4444` (error)
- **UI patterns**: `.tab-bar` + `.tab-item.active` (underline tabs), `.run-item` (expandable agent rows), `.stats-grid` + `.stat-card`

## Environment Variables

See `.env.example`. Key variables:
| Variable | Purpose |
|---|---|
| `DATABASE_URL` | PostgreSQL (`postgresql+asyncpg://...`) |
| `GEMINI_API_KEY` | Google Gemini LLM |
| `GITHUB_TOKEN` | GitHub PAT |
| `GITHUB_REPO` | Target repo (`owner/repo`) |
| `SMTP_USER` / `SMTP_PASSWORD` | Gmail SMTP |
| `TARGET_EMAIL` | Notification recipient |
