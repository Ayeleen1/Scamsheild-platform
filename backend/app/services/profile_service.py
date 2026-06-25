import json
import re
from urllib.parse import urlparse

from app.schemas.scan import ScanDetail, ScanResult
from app.services.llm_client import get_llm


def _heuristic_profile(profile_url: str, platform: str | None) -> ScanResult:
    parsed = urlparse(profile_url)
    username = parsed.path.strip("/") or "unknown"
    score = 45
    details = [ScanDetail(label="profile_url", value=profile_url)]

    if "http" not in profile_url:
        score += 10
        details.append(ScanDetail(label="format", value="missing http/https"))

    if len(username) < 4 or re.search(r"\d{4,}", username):
        score += 15
        details.append(ScanDetail(label="username", value="unusual or numeric username"))

    if any(word in username.lower() for word in ["official", "free", "giveaway", "support", "prize"]):
        score += 10
        details.append(ScanDetail(label="username_flag", value="promotional/fake-sounding username"))

    if platform is None:
        if "instagram" in profile_url:
            platform = "Instagram"
        elif "facebook" in profile_url:
            platform = "Facebook"
        elif "tiktok" in profile_url:
            platform = "TikTok"
        elif "whatsapp" in profile_url:
            platform = "WhatsApp"
        else:
            platform = "Unknown"

    details.append(ScanDetail(label="platform", value=platform))

    if score > 75:
        risk = "high_risk"
    elif score > 50:
        risk = "suspicious"
    else:
        risk = "safe"

    return ScanResult(
        risk_level=risk,
        score=min(score, 100),
        summary="Profile shows signs of suspicious activity" if score > 50 else "Profile looks low-risk on initial checks",
        details=details,
    )


async def analyze_profile(profile_url: str, platform: str | None = None) -> ScanResult:
    from app.db import repository as repo

    hit = await repo.match_blacklist(profile_url)
    if hit:
        return ScanResult(
            risk_level="high_risk",
            score=90,
            summary="Community reported profile — high risk",
            details=[
                ScanDetail(label="blacklist", value=hit["value"]),
                ScanDetail(label="reason", value=hit.get("reason") or "reported"),
            ],
        )

    base = _heuristic_profile(profile_url, platform)
    client, model, _ = get_llm()
    if not client:
        return base

    prompt = f"""Analyze social profile URL for scam risk (Pakistan context).
URL: {profile_url}
Platform: {platform or "auto"}
Reply JSON only: {{"risk_level":"safe|suspicious|high_risk","score":0-100,"summary":"one line","flags":["max 3 short strings"]}}"""

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a scam profile analyst. JSON only."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.2,
            max_tokens=180,
        )
        raw = (response.choices[0].message.content or "").strip()
        if "```" in raw:
            raw = raw.split("```")[1].replace("json", "").strip()
        data = json.loads(raw)
        details = list(base.details)
        for flag in (data.get("flags") or [])[:3]:
            details.append(ScanDetail(label="ai_flag", value=str(flag)))
        return ScanResult(
            risk_level=data.get("risk_level", base.risk_level),
            score=min(int(data.get("score", base.score)), 100),
            summary=data.get("summary", base.summary),
            details=details,
        )
    except Exception:
        return base
