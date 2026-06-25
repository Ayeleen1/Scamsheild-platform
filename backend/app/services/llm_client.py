"""Multi-provider LLM client (OpenAI-compatible APIs)."""

import httpx
from openai import AsyncOpenAI

from app.core.config import settings

# Fast free models (tested on OpenRouter). openrouter/free is accurate but slow.
DEFAULT_MODELS = {
    "openai": "gpt-4o-mini",
    "openrouter": "openrouter/free",
    "groq": "llama-3.1-8b-instant",
    "xai": "grok-2-1212",
}

OPENROUTER_FALLBACK_MODELS = [
    "openrouter/free",
    "google/gemma-4-26b-a4b-it:free",
]

HTTP_TIMEOUT = httpx.Timeout(connect=5.0, read=22.0, write=10.0, pool=5.0)


def _make_client(api_key: str, base_url: str | None = None, extra_headers: dict | None = None) -> AsyncOpenAI:
    kwargs: dict = {"api_key": api_key, "timeout": HTTP_TIMEOUT}
    if base_url:
        kwargs["base_url"] = base_url
    if extra_headers:
        kwargs["default_headers"] = extra_headers
    return AsyncOpenAI(**kwargs)


def get_llm() -> tuple[AsyncOpenAI | None, str, str]:
    provider = (settings.AI_PROVIDER or "").strip().lower()
    if not provider:
        if settings.OPENROUTER_API_KEY:
            provider = "openrouter"
        elif settings.GROQ_API_KEY:
            provider = "groq"
        elif settings.XAI_API_KEY:
            provider = "xai"
        elif settings.OPENAI_API_KEY:
            provider = "openai"
        else:
            provider = "none"

    if provider == "openrouter" and settings.OPENROUTER_API_KEY:
        model = settings.AI_MODEL or DEFAULT_MODELS["openrouter"]
        client = _make_client(
            settings.OPENROUTER_API_KEY,
            "https://openrouter.ai/api/v1",
            {"HTTP-Referer": "http://localhost:3000", "X-Title": "ScamShield AI"},
        )
        return client, model, "openrouter"

    if provider == "groq" and settings.GROQ_API_KEY:
        model = settings.AI_MODEL or DEFAULT_MODELS["groq"]
        return _make_client(settings.GROQ_API_KEY, "https://api.groq.com/openai/v1"), model, "groq"

    if provider == "xai" and settings.XAI_API_KEY:
        model = settings.AI_MODEL or DEFAULT_MODELS["xai"]
        return _make_client(settings.XAI_API_KEY, "https://api.x.ai/v1"), model, "xai"

    if settings.OPENAI_API_KEY:
        model = settings.AI_MODEL or DEFAULT_MODELS["openai"]
        return _make_client(settings.OPENAI_API_KEY), model, "openai"

    return None, "", "none"


def openrouter_fallback_models(primary: str) -> list[str]:
    models = [primary]
    for m in OPENROUTER_FALLBACK_MODELS:
        if m not in models:
            models.append(m)
    return models


def ai_configured() -> bool:
    client, _, _ = get_llm()
    return client is not None
