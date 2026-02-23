from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    APP_NAME: str = "AI Orchestrator"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # Database (PostgreSQL)
    DATABASE_URL: str  # e.g. postgresql+asyncpg://user:pass@localhost:5432/ai_orchestrator

    # Gemini / Google
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-2.5-flash"

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
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    return Settings()
