import httpx
import base64
from app.core.config import settings

async def scan_url(url: str) -> dict:
    # VirusTotal API v3
    api_key = settings.VIRUSTOTAL_API_KEY
    if not api_key:
        return {"error": "VirusTotal API key not configured"}
    
    # Encode URL for VirusTotal
    url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")
    
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://www.virustotal.com/api/v3/urls/{url_id}",
            headers={"x-apikey": api_key}
        )
    
    if response.status_code == 200:
        data = response.json()
        stats = data["data"]["attributes"]["last_analysis_stats"]
        malicious = stats.get("malicious", 0)
        suspicious = stats.get("suspicious", 0)
        
        risk_level = "SAFE"
        if malicious > 5:
            risk_level = "SCAM"
        elif malicious > 0 or suspicious > 3:
            risk_level = "HIGH_RISK"
        elif suspicious > 0:
            risk_level = "SUSPICIOUS"
        
        return {
            "url": url,
            "risk_level": risk_level,
            "malicious_count": malicious,
            "suspicious_count": suspicious,
            "total_engines": stats.get("harmless", 0) + malicious
        }
    return {"error": "Could not scan URL", "status": response.status_code}