from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI Orchestrator"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # Database (PostgreSQL)
    DATABASE_URL: str  # e.g. postgresql+asyncpg://user:pass@localhost:5432/ai_orchestrator

    # Anthropic / Claude
    CLAUDE_API_KEY: str
    CLAUDE_MODEL: str = "claude-3-5-sonnet-20241022"

    # GitHub
    GITHUB_TOKEN: str
    GITHUB_REPO: str  # format: owner/repo  e.g. AbhiGaddi/ai-orchestrator

    # Email (SMTP)
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USER: str
    SMTP_PASSWORD: str
    TARGET_EMAIL: str  # hardcoded recipient for Phase 1

    # Phase 2+ (stubs — not used yet)
    DOCKER_REGISTRY: str = ""
    K8S_NAMESPACE: str = ""

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
