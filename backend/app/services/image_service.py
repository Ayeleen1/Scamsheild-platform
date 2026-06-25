from urllib.parse import urlparse

from app.schemas.scan import ScanResult, ScanDetail

SUSPICIOUS_TERMS = [
    "fake",
    "verify",
    "login",
    "secure",
    "update",
    "offer",
    "free",
    "avatar",
    "profilepic",
]

SAFE_DOMAINS = [
    "cdn",
    "images",
    "imgur",
    "cloudinary",
    "githubusercontent",
    "googleusercontent",
]

IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".bmp", ".svg"]


async def verify_image(image_url: str) -> ScanResult:
    parsed = urlparse(image_url)
    domain = parsed.netloc.lower()
    path = parsed.path.lower()
    score = 35
    details = [ScanDetail(label="image_url", value=image_url), ScanDetail(label="domain", value=domain)]

    if any(term in domain for term in SUSPICIOUS_TERMS) or any(term in path for term in SUSPICIOUS_TERMS):
        score += 25
        details.append(ScanDetail(label="suspicious_terms", value="URL contains scam-like image or verification keywords"))

    if not any(path.endswith(ext) for ext in IMAGE_EXTENSIONS):
        score += 15
        details.append(ScanDetail(label="file_type", value="image file extension not clearly present"))
    else:
        details.append(ScanDetail(label="file_type", value="recognized image file extension"))

    if any(domain_part in domain for domain_part in SAFE_DOMAINS):
        score -= 10
        details.append(ScanDetail(label="trusted_host", value="host resembles a common image CDN"))

    if any(char.isdigit() for char in parsed.path[-6:]):
        score += 10
        details.append(ScanDetail(label="random_path", value="image path ends with numeric code"))

    risk_level = "safe"
    if score > 75:
        risk_level = "high_risk"
    elif score > 50:
        risk_level = "suspicious"

    summary = (
        "Image URL appears suspicious and may be used in scams."
        if score > 50
        else "Image URL looks generally low-risk based on current checks."
    )

    return ScanResult(
        risk_level=risk_level,
        score=max(0, min(score, 100)),
        summary=summary,
        details=details,
    )
