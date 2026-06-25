import asyncio
import json
import re

from app.core.config import settings
from app.services.llm_client import get_llm, openrouter_fallback_models
from app.services.scan_helpers import heuristic_message_scan

MAX_MESSAGE_CHARS = 2500
AI_TIMEOUT_SECONDS = 25
MAX_OUTPUT_TOKENS = 380

SYSTEM_PROMPT = """Cybersecurity scam analyst for Pakistan. Reply ONLY valid JSON, no markdown:
{"risk_score":0-100,"risk_level":"SAFE|SUSPICIOUS|HIGH_RISK|SCAM","scam_type":"none|phishing|romance_scam|job_fraud|crypto_scam|otp_fraud|fake_giveaway|investment_fraud","confidence":0-100,"red_flags":["max 3 short items"],"explanation":"max 2 sentences","recommendations":["max 2 short items"]}"""


def _parse_json_content(raw: str) -> dict:
    text = (raw or "").strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        text = match.group(0)
    data = json.loads(text)
    data["red_flags"] = (data.get("red_flags") or [])[:3]
    data["recommendations"] = (data.get("recommendations") or [])[:2]
    if data.get("explanation"):
        data["explanation"] = str(data["explanation"])[:400]
    return data


def _trim_text(text: str) -> str:
    t = text.strip()
    if len(t) > MAX_MESSAGE_CHARS:
        return t[:MAX_MESSAGE_CHARS] + "\n[truncated]"
    return t


def _fallback_note(exc: Exception, provider: str) -> str:
    err = str(exc).lower()
    if "timeout" in err or "timed out" in err:
        return f" ({provider} slow/timeout — fast heuristic used)"
    if "quota" in err or "429" in err:
        return f" ({provider} rate limit — heuristic used)"
    return f" ({provider} unavailable — heuristic used)"


def _merge_heuristic(ai: dict, heuristic) -> dict:
    """Boost score if rules found stronger signals than AI."""
    score = max(int(ai.get("risk_score", 0)), heuristic.score)
    level = ai.get("risk_level", "SUSPICIOUS").upper()
    h_level = heuristic.risk_level.upper()
    rank = {"SAFE": 0, "SUSPICIOUS": 1, "HIGH_RISK": 2, "SCAM": 3}
    if rank.get(h_level, 0) > rank.get(level, 0):
        level = h_level
    flags = list(ai.get("red_flags") or [])[:3]
    for d in heuristic.details:
        if d.label in ("keyword_match", "link_detected") and d.value not in flags:
            flags.append(d.value)
            if len(flags) >= 3:
                break
    ai["risk_score"] = score
    ai["risk_level"] = level
    ai["red_flags"] = flags[:3]
    return ai


async def _call_model(client, model: str, user_content: str, provider: str) -> dict:
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]
    kwargs = {
        "model": model,
        "messages": messages,
        "temperature": 0.1,
        "max_tokens": MAX_OUTPUT_TOKENS,
    }
    # OpenRouter free models: skip response_format (faster, one round-trip)
    if provider == "openai":
        kwargs["response_format"] = {"type": "json_object"}

    response = await client.chat.completions.create(**kwargs)
    return _parse_json_content(response.choices[0].message.content)


async def _chat_json(client, model: str, user_content: str, provider: str) -> dict:
    models = openrouter_fallback_models(model) if provider == "openrouter" else [model]
    last_error: Exception | None = None

    for attempt_model in models:
        try:
            return await asyncio.wait_for(
                _call_model(client, attempt_model, user_content, provider),
                timeout=AI_TIMEOUT_SECONDS,
            )
        except Exception as exc:
            last_error = exc
            if "429" in str(exc).lower():
                await asyncio.sleep(2)
            continue

    if last_error:
        raise last_error
    raise RuntimeError("AI call failed")


async def analyze_message(text: str) -> dict:
    text = _trim_text(text)
    heuristic = heuristic_message_scan(text)

    client, model, provider = get_llm()
    if not client:
        return {
            "risk_score": heuristic.score,
            "risk_level": heuristic.risk_level.upper(),
            "scam_type": "unknown",
            "confidence": 60,
            "red_flags": [d.value for d in heuristic.details if d.label == "keyword_match"][:3],
            "explanation": heuristic.summary,
            "recommendations": ["Do not share OTP or passwords."],
        }

    try:
        ai = await _chat_json(
            client,
            model,
            f"Analyze this message for scams:\n{text}",
            provider,
        )
        return _merge_heuristic(ai, heuristic)
    except Exception as exc:
        return {
            "risk_score": heuristic.score,
            "risk_level": heuristic.risk_level.upper(),
            "scam_type": "unknown",
            "confidence": 50,
            "red_flags": [d.value for d in heuristic.details][:3],
            "explanation": heuristic.summary + _fallback_note(exc, provider),
            "recommendations": ["Do not share OTP or passwords."],
        }


async def analyze_profile(
    platform: str,
    username: str,
    bio: str = "",
    followers: int = 0,
    following: int = 0,
    posts: int = 0,
    account_age_days: int = 0,
) -> dict:
    profile_data = (
        f"Platform:{platform} User:{username} Bio:{bio[:200]} "
        f"Followers:{followers} Following:{following} Posts:{posts} AgeDays:{account_age_days}"
    )
    client, model, provider = get_llm()
    if not client:
        return {
            "risk_score": 45,
            "risk_level": "SUSPICIOUS",
            "scam_type": "none",
            "confidence": 40,
            "red_flags": ["AI unavailable"],
            "explanation": "Set OPENROUTER_API_KEY in .env",
            "recommendations": ["Verify on official app."],
        }

    try:
        return await _chat_json(client, model, f"Analyze profile:\n{profile_data}", provider)
    except Exception as exc:
        return {
            "risk_score": 45,
            "risk_level": "SUSPICIOUS",
            "scam_type": "unknown",
            "confidence": 40,
            "red_flags": ["AI call failed"],
            "explanation": "Profile analysis failed" + _fallback_note(exc, provider),
            "recommendations": ["Verify manually."],
        }
