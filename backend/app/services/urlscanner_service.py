import httpx
import re
from urllib.parse import urlparse

from app.core.config import settings
from app.schemas.scan import ScanDetail, ScanResult

SUSPICIOUS_PATTERNS = [
    r"free-.*",
    r"login-.*",
    r"verify-.*",
    r"account-.*",
    r"secure-.*",
]

TRUSTED_DOMAINS = [
    "google.com",
    "www.google.com",
    "youtube.com",
    "facebook.com",
    "www.facebook.com",
    "instagram.com",
    "twitter.com",
    "x.com",
    "linkedin.com",
    "microsoft.com",
    "apple.com",
    "github.com",
    "wikipedia.org",
    "gov.pk",
    "hbl.com",
    "ubldigital.com",
    "meezanbank.com",
]


def _base_domain(host: str) -> str:
    host = host.lower().removeprefix("www.")
    parts = host.split(".")
    if len(parts) >= 2:
        return ".".join(parts[-2:])
    return host


async def scan_url(url: str) -> ScanResult:
    from app.db import repository as repo

    hit = await repo.match_blacklist(url)
    if hit:
        return ScanResult(
            risk_level="high_risk",
            score=92,
            summary="Community reported — this URL/domain is on the blacklist",
            details=[
                ScanDetail(label="blacklist", value=hit["value"]),
                ScanDetail(label="reason", value=hit.get("reason") or "reported scam"),
            ],
        )

    parsed = urlparse(url)
    domain = parsed.netloc.lower()
    base = _base_domain(domain)
    score = 15
    confidence = 0.35
    details = [ScanDetail(label="domain", value=domain)]

    if base in TRUSTED_DOMAINS or any(base.endswith(f".{t}") for t in TRUSTED_DOMAINS):
        return ScanResult(
            risk_level="safe",
            score=8,
            summary="Known trusted domain — low risk",
            details=details + [ScanDetail(label="trusted_domain", value="Listed trusted site")],
        )

    if any(p in domain for p in ["login", "verify", "secure", "update", "account"]):
        score += 25
        confidence += 0.12
        details.append(ScanDetail(label="suspicious_domain", value="contains scam-related keywords"))

    if re.search(r"\d{2,}", domain):
        score += 10
        confidence += 0.08
        details.append(ScanDetail(label="unusual_domain", value="numbers in domain"))

    if any(re.match(pattern, parsed.path.lstrip("/")) for pattern in SUSPICIOUS_PATTERNS):
        score += 15
        confidence += 0.1
        details.append(ScanDetail(label="abnormal_path", value="suspicious path naming"))

    # Typosquatting-style hyphen chains
    if domain.count("-") >= 2:
        score += 15
        confidence += 0.1
        details.append(ScanDetail(label="domain_pattern", value="multiple hyphens in domain"))

    gsb_details, gsb_score, gsb_summary = await _google_safe_browsing_scan(url)
    if gsb_details:
        details.extend(gsb_details)
    if gsb_score is not None:
        score = max(score, gsb_score)
        confidence = max(confidence, 0.9)
        summary = gsb_summary or summary

    summary = ""
    vt_details, vt_score, vt_summary = await _virustotal_url_scan(url)
    if vt_details:
        details.extend(vt_details)
        if vt_score is not None:
            score = max(score, vt_score)
            confidence = max(confidence, 0.85 if vt_score >= 70 else 0.7)
            summary = vt_summary or summary

    score = min(score, 100)
    if score >= 70:
        risk_level = "high_risk"
        summary = summary or "URL appears highly suspicious"
    elif score >= 40:
        risk_level = "suspicious"
        summary = summary or "URL appears suspicious"
    else:
        risk_level = "safe"
        summary = summary or "URL appears low risk"

    return ScanResult(
        risk_level=risk_level,
        score=score,
        summary=summary,
        details=details + [ScanDetail(label="confidence", value=f"{round(min(confidence, 0.99)*100)}%")],
    )


async def _virustotal_url_scan(url: str) -> tuple[list[ScanDetail], int | None, str | None]:
    api_key = settings.VIRUSTOTAL_API_KEY.strip()
    if not api_key:
        return [], None, None

    headers = {
        "x-apikey": api_key,
        "User-Agent": "ScamShieldAI/1.0",
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            response = await client.post(
                "https://www.virustotal.com/api/v3/urls",
                data={"url": url},
                headers=headers,
            )
            response.raise_for_status()
            vt_id = response.json().get("data", {}).get("id")
            if not vt_id:
                return [ScanDetail(label="virustotal", value="No analysis ID returned")], None, "VirusTotal scan not available"

            result = await client.get(
                f"https://www.virustotal.com/api/v3/urls/{vt_id}",
                headers=headers,
            )
            result.raise_for_status()
            vt_data = result.json().get("data", {}).get("attributes", {})
            stats = vt_data.get("last_analysis_stats", {})
            malicious = int(stats.get("malicious", 0))
            suspicious = int(stats.get("suspicious", 0))
            harmless = int(stats.get("harmless", 0))
            undetected = int(stats.get("undetected", 0))

            details = [
                ScanDetail(label="virustotal_malicious", value=str(malicious)),
                ScanDetail(label="virustotal_suspicious", value=str(suspicious)),
                ScanDetail(label="virustotal_undetected", value=str(undetected)),
            ]

            if malicious > 0:
                return details, 95, "VirusTotal detected malicious sources for this URL"
            if suspicious > 0:
                return details, 70, "VirusTotal detected suspicious sources for this URL"

            return details, 10, "VirusTotal reports this URL as low risk"

        except httpx.HTTPStatusError as exc:
            return [ScanDetail(label="virustotal_error", value=f"HTTP {exc.response.status_code}")], None, f"VirusTotal error {exc.response.status_code}"
        except Exception as exc:
            return [ScanDetail(label="virustotal_error", value=str(exc))], None, "VirusTotal unavailable"


async def _google_safe_browsing_scan(url: str) -> tuple[list[ScanDetail], int | None, str | None]:
    api_key = settings.GOOGLE_SAFE_BROWSING_API_KEY.strip()
    if not api_key:
        return [], None, None
    endpoint = f"https://safebrowsing.googleapis.com/v4/threatMatches:find?key={api_key}"
    payload = {
        "client": {"clientId": "scamshield-ai", "clientVersion": "1.0.0"},
        "threatInfo": {
            "threatTypes": [
                "MALWARE",
                "SOCIAL_ENGINEERING",
                "UNWANTED_SOFTWARE",
                "POTENTIALLY_HARMFUL_APPLICATION",
            ],
            "platformTypes": ["ANY_PLATFORM"],
            "threatEntryTypes": ["URL"],
            "threatEntries": [{"url": url}],
        },
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(endpoint, json=payload)
            response.raise_for_status()
            matches = response.json().get("matches", [])
            if not matches:
                return [ScanDetail(label="safe_browsing", value="no threats found")], 12, "Google Safe Browsing reports low risk"
            first = matches[0]
            threat = first.get("threatType", "UNKNOWN")
            return (
                [ScanDetail(label="safe_browsing_threat", value=threat)],
                97,
                f"Google Safe Browsing flagged this URL ({threat})",
            )
    except Exception as exc:
        return [ScanDetail(label="safe_browsing_error", value=str(exc))], None, None
