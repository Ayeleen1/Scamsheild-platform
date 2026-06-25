from app.schemas.scan import ScanDetail, ScanResult


def _normalize_risk_level(level: str) -> str:
    mapping = {
        "SAFE": "safe",
        "SUSPICIOUS": "suspicious",
        "HIGH_RISK": "high_risk",
        "SCAM": "high_risk",
        "safe": "safe",
        "suspicious": "suspicious",
        "high_risk": "high_risk",
    }
    return mapping.get(level, mapping.get(level.upper(), "suspicious"))


def ai_json_to_scan_result(data: dict) -> ScanResult:
    details: list[ScanDetail] = []

    scam_type = data.get("scam_type", "none")
    if scam_type and scam_type != "none":
        details.append(ScanDetail(label="scam_type", value=str(scam_type)))

    for flag in data.get("red_flags", []):
        details.append(ScanDetail(label="red_flag", value=str(flag)))

    for rec in data.get("recommendations", []):
        details.append(ScanDetail(label="recommendation", value=str(rec)))

    confidence = data.get("confidence")
    if confidence is not None:
        details.append(ScanDetail(label="confidence", value=f"{confidence}%"))

    explanation = data.get("explanation", "Analysis complete.")
    details.append(ScanDetail(label="explanation", value=explanation))

    return ScanResult(
        risk_level=_normalize_risk_level(str(data.get("risk_level", "SUSPICIOUS"))),
        score=int(data.get("risk_score", 50)),
        summary=explanation,
        details=details,
    )


SCAM_KEYWORDS: list[tuple[str, int, str]] = [
    ("otp", 25, "OTP / verification code request"),
    ("verify your account", 20, "Account verification pressure"),
    ("won", 15, "Prize / lottery wording"),
    ("free iphone", 25, "Fake giveaway"),
    ("click here", 15, "Urgent link prompt"),
    ("usdt", 20, "Crypto payment mention"),
    ("bitcoin", 20, "Crypto payment mention"),
    ("investment", 15, "Investment pitch"),
    ("job offer", 15, "Job scam pattern"),
    ("send money", 25, "Money transfer request"),
    ("bank blocked", 20, "Banking urgency scam"),
    ("whatsapp", 10, "Off-platform contact push"),
    ("prize", 15, "Prize scam wording"),
    ("limited time", 12, "Urgency tactic"),
    ("account suspend", 20, "Account suspension threat"),
    ("share otp", 25, "OTP share request"),
    ("jazzcash", 15, "Mobile wallet payment"),
    ("easypaisa", 15, "Mobile wallet payment"),
    ("jeet", 15, "Prize wording (Urdu)"),
    ("jeet liya", 20, "Fake prize (Urdu)"),
    ("block ho", 15, "Account block threat (Urdu)"),
    ("urgent money", 20, "Romance / urgency scam"),
    ("i love you", 15, "Romance manipulation"),
]


def heuristic_message_scan(text: str) -> ScanResult:
    lowered = text.lower()
    score = 10
    details: list[ScanDetail] = []

    for keyword, weight, label in SCAM_KEYWORDS:
        if keyword in lowered:
            score += weight
            details.append(ScanDetail(label="keyword_match", value=label))

    if "http://" in lowered or "https://" in lowered or "bit.ly" in lowered:
        score += 15
        details.append(ScanDetail(label="link_detected", value="Message contains a URL"))

    score = min(score, 100)
    if score >= 70:
        risk = "high_risk"
        summary = "Multiple scam indicators detected. Do not reply or click links."
    elif score >= 40:
        risk = "suspicious"
        summary = "Some suspicious patterns found. Verify before taking action."
    else:
        risk = "safe"
        summary = "No strong scam patterns detected, but stay cautious."

    if not details:
        details.append(ScanDetail(label="note", value="Quick pattern scan"))

    return ScanResult(risk_level=risk, score=score, summary=summary, details=details)
