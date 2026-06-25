import json

from app.services.llm_client import get_llm

CHAT_SYSTEM = """You are ScamShield AI security assistant for Pakistani users.
Answer in 2-4 short sentences. Mix simple English; add Roman Urdu phrase if helpful.
Topics: scams, phishing, OTP fraud, fake profiles, URLs, online safety.
If user asks to analyze text, give risk level and 2 tips. Be direct like WhatsApp chat."""


async def chat_reply(user_message: str, history: list[dict] | None = None) -> dict:
    client, model, provider = get_llm()
    if not client:
        return {
            "reply": "AI offline. Use Message Scanner for instant check. Tip: OTP kabhi share na karo.",
            "provider": "offline",
        }

    messages = [{"role": "system", "content": CHAT_SYSTEM}]
    for item in (history or [])[-4:]:
        role = item.get("role", "user")
        if role in ("user", "assistant"):
            messages.append({"role": role, "content": str(item.get("content", ""))[:500]})
    messages.append({"role": "user", "content": user_message[:1500]})

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=messages,
            temperature=0.3,
            max_tokens=220,
        )
        text = (response.choices[0].message.content or "").strip()
        return {"reply": text, "provider": provider}
    except Exception:
        return {
            "reply": "Server busy (rate limit). Try Quick Scan on /scam-analyzer — fast & no wait.",
            "provider": provider,
        }
