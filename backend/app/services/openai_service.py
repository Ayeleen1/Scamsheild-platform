import openai

from app.core.config import settings

openai.api_key = settings.openai_api_key


async def analyze_message(text: str) -> dict:
    prompt = (
        "Aik social media scam analyzer bano. User ka message analyze karo aur batao agar phishing, fake giveaway, OTP fraud, crypto scam, job scam, ya romance scam ho. "
        "Output JSON mein risk score aur short summary do. Example: 'safe', 'suspicious', 'high_risk'."
    )

    try:
        response = await openai.ChatCompletion.acreate(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": text},
            ],
            max_tokens=250,
            temperature=0.3,
        )
        raw = response.choices[0].message.content.strip()
        return {"raw": raw, "success": True}
    except Exception as exc:
        return {"raw": "AI analysis temporarily unavailable", "success": False, "error": str(exc)}
