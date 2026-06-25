from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
ENV_PATH = BACKEND_DIR / ".env"


class Settings(BaseSettings):
    DATABASE_BACKEND: str = "sqlite"  # sqlite | mongo
    SQLITE_PATH: str = str(BACKEND_DIR / "scamshield.db")
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB: str = "scamshield"
    JWT_SECRET_KEY: str = "change-me-in-production-use-secrets-token-urlsafe"
    # AI: openai | openrouter | groq | xai  (openrouter/groq have free tiers)
    AI_PROVIDER: str = "openai"
    AI_MODEL: str = ""
    AI_TIMEOUT_SECONDS: int = 20
    AI_MAX_TOKENS: int = 380
    OPENAI_API_KEY: str = ""
    OPENROUTER_API_KEY: str = ""
    GROQ_API_KEY: str = ""
    XAI_API_KEY: str = ""
    VIRUSTOTAL_API_KEY: str = ""
    GOOGLE_SAFE_BROWSING_API_KEY: str = ""
    CORS_ORIGINS: str = "http://localhost:3000"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    SESSION_IDLE_TIMEOUT_MINUTES: int = 60
    ADMIN_EMAIL: str = ""
    MAX_LOGIN_ATTEMPTS: int = 5
    LOGIN_LOCKOUT_MINUTES: int = 15
    CAPTCHA_ALWAYS_ON: bool = False
    CAPTCHA_TRIGGER_FAILURES: int = 3
    FILE_SCAN_MAX_MB: int = 8

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    model_config = SettingsConfigDict(
        env_file=str(ENV_PATH),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
