"""
AI Orchestrator — FastAPI Application Entry Point
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.config import get_settings
from backend.core.logging import setup_logging, get_logger
from backend.db.database import engine, Base
from backend.api import discussion, approval, execution, agent_runs, projects

settings = get_settings()
setup_logging()
logger = get_logger(__name__)


from backend.core.scheduler import start_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create all DB tables, start scheduler. Shutdown: dispose engine."""
    logger.info("🚀 AI Orchestrator starting up…")
    async with engine.begin() as conn:
        # In development, auto-create tables. In production, use Alembic migrations.
        if settings.APP_ENV == "development":
            await conn.run_sync(Base.metadata.create_all)
            logger.info("✅ Database tables ready")
    
    # Start the background sync scheduler
    scheduler = start_scheduler()
    
    yield
    
    # Shutdown
    scheduler.shutdown()
    await engine.dispose()
    logger.info("🛑 AI Orchestrator shut down")


app = FastAPI(
    title="AI Orchestrator",
    description="Multi-phase AI pipeline: Discussion → Tasks → GitHub Issue → Email → Code → Build → Deploy",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(projects.router)
app.include_router(discussion.router)
app.include_router(approval.router)
app.include_router(execution.router)
app.include_router(agent_runs.router)


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "ok", "app": settings.APP_NAME, "env": settings.APP_ENV}
