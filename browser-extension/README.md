# ScamShield Social Guard Extension

Chrome extension that checks social-media links with your ScamShield backend before opening.

## What it does

- Intercepts clicks on Instagram, Facebook, TikTok, WhatsApp Web, X/Twitter.
- Calls `POST /api/v1/scan/url`.
- Blocks high-risk links (`high_risk` or score `>= 70`) and shows warning popup.
- Allows safe links normally.

## Setup

1. Start backend:

```powershell
cd "C:\Users\MUAZZMA SHAH\Desktop\scamshield-platform\backend"
..\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

2. Open Chrome and go to `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select this folder: `browser-extension`.

## Test quickly

1. Open any matched social media site.
2. Click a suspicious URL like `http://freegift-login-verify.xyz`.
3. Warning popup should appear and block navigation.

## Notes

- If backend is down, extension allows open (fail-open behavior).
- For production, switch to fail-closed and add domain allowlist + signatures.
