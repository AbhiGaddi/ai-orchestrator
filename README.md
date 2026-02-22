# 🤖 AI Orchestrator

> Multi-phase AI pipeline: **Discussion → Tasks → GitHub Issue → Email → Code → Build → Deploy**

---

## 📐 Architecture

```
Phase 1:  Discussion → Tasks → GitHub Issue → Email       ✅ Active
Phase 2:  Design → CodeAgent → Pull Request               🔜 Planned
Phase 3:  PR Merged → BuildAgent → Docker Image           🔜 Planned
Phase 4:  Image Tagged → DeployAgent → Kubernetes         🔜 Planned
```

## 🗂 Folder Structure

```
ai-orchestrator/
├── backend/
│   ├── main.py               # FastAPI entry point
│   ├── config.py             # All env vars (Pydantic BaseSettings)
│   ├── agents/               # One file per agent
│   │   ├── base_agent.py     # Abstract base — all agents inherit this
│   │   ├── discussion_agent.py
│   │   ├── ticket_agent.py
│   │   ├── email_agent.py
│   │   ├── code_agent.py     # Phase 2 stub
│   │   ├── build_agent.py    # Phase 3 stub
│   │   └── deploy_agent.py   # Phase 4 stub
│   ├── services/             # Pure API wrappers (no business logic)
│   │   ├── claude_service.py
│   │   ├── github_service.py
│   │   └── mailer_service.py
│   ├── api/                  # FastAPI routers by domain
│   │   ├── discussion.py     # POST /api/discussion/extract
│   │   ├── approval.py       # GET/PATCH /api/tasks
│   │   ├── execution.py      # POST /api/execution/{id}/execute
│   │   └── agent_runs.py     # GET /api/agent-runs (dashboard polling)
│   ├── db/
│   │   ├── database.py       # SQLAlchemy async engine
│   │   ├── models.py         # Task + AgentRun models
│   │   └── migrations/       # Alembic migrations
│   ├── schemas/              # Pydantic request/response schemas
│   └── core/
│       ├── orchestrator.py   # Pipeline coordinator
│       └── logging.py        # Structured logging
└── frontend/                 # Next.js UI
```

## 🚀 Quick Start

### 1. Clone & configure
```bash
git clone https://github.com/AbhiGaddi/ai-orchestrator.git
cd ai-orchestrator
cp .env.example .env
# Fill in your .env values
```

### 2. Start with Docker Compose
```bash
docker compose up --build
```

### 3. Or run backend locally
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.main:app --reload
```

API docs: http://localhost:8000/docs

## 🔑 API Flow (Phase 1)

| Step | Endpoint | Who triggers |
|------|----------|-------------|
| 1. Extract tasks | `POST /api/discussion/extract` | UI |
| 2. Review tasks | `GET /api/tasks` | UI |
| 3. Edit task | `PATCH /api/tasks/{id}` | Human |
| 4. Approve task | `PATCH /api/tasks/{id}/approve` | Human |
| 5. Execute pipeline | `POST /api/execution/{id}/execute` | Human |
| 6. Watch dashboard | `GET /api/agent-runs` | UI (polling) |

## ⚙️ Environment Variables

See [`.env.example`](.env.example) for all required variables.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `CLAUDE_API_KEY` | Anthropic API key |
| `GITHUB_TOKEN` | GitHub Personal Access Token |
| `GITHUB_REPO` | Target repo in `owner/repo` format |
| `SMTP_USER` / `SMTP_PASSWORD` | Gmail credentials |
| `TARGET_EMAIL` | Email recipient (Phase 1 hardcoded) |
