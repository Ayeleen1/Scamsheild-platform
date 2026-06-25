const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
const SCAN = `${BASE}/scan`;

export interface ScanDetail {
  label: string;
  value: string;
}

export interface ScanResult {
  risk_level: string;
  score: number;
  summary: string;
  details: ScanDetail[];
}

async function parseApiError(res: Response, fallback: string): Promise<never> {
  let body: any = null
  try {
    body = await res.json()
  } catch {
    throw new Error(fallback)
  }
  const message = body?.detail || body?.message || fallback
  throw new Error(message)
}

export async function analyzeMessageQuick(text: string): Promise<ScanResult> {
  const res = await fetch(`${SCAN}/message/quick`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    await parseApiError(res, "Quick scan failed")
  }
  return res.json()
}

export async function analyzeMessage(text: string): Promise<ScanResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);
  const res = await fetch(`${SCAN}/message`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
    signal: controller.signal,
  });
  clearTimeout(timeout);
  if (!res.ok) {
    await parseApiError(res, "Analysis failed")
  }
  return res.json();
}

export async function scanURL(url: string): Promise<ScanResult> {
  const res = await fetch(`${SCAN}/url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) {
    await parseApiError(res, "URL scan failed")
  }
  return res.json();
}

export async function scanProfile(profileUrl: string, platform?: string | null): Promise<ScanResult> {
  const res = await fetch(`${SCAN}/profile`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ profile_url: profileUrl, platform: platform || null }),
  });
  if (!res.ok) {
    await parseApiError(res, "Profile scan failed")
  }
  return res.json();
}

export async function verifyImage(imageUrl: string): Promise<ScanResult> {
  const res = await fetch(`${SCAN}/image`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image_url: imageUrl }),
  });
  if (!res.ok) {
    await parseApiError(res, "Image verification failed")
  }
  return res.json();
}

export const API_BASE = BASE;

export interface ChatHistoryItem {
  role: 'user' | 'assistant';
  content: string;
}

export async function sendChat(message: string, history: ChatHistoryItem[] = []) {
  const res = await fetch(`${BASE}/chat/message`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  })
  if (!res.ok) {
    await parseApiError(res, 'Chat failed')
  }
  return res.json() as Promise<{ reply: string; provider: string }>;
}

export async function fetchCommunityReports(limit = 30) {
  const res = await fetch(`${BASE}/community/reports?limit=${limit}`)
  if (!res.ok) {
    await parseApiError(res, 'Could not load community reports')
  }
  return res.json() as Promise<{ reports: Array<{ id: string; source_type: string; source_value: string; summary: string; created_at: string }> }>;
}

export async function fetchBlacklist(limit = 40) {
  const res = await fetch(`${BASE}/community/blacklist?limit=${limit}`)
  if (!res.ok) {
    await parseApiError(res, 'Could not load blacklist')
  }
  return res.json() as Promise<{ items: Array<{ value: string; kind: string; reason: string; created_at: string }> }>;
}

export async function postAnonymousReport(payload: {
  source_type: string;
  source_value: string;
  summary: string;
  platform?: string;
}) {
  const res = await fetch(`${BASE}/community/report-anonymous`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    await parseApiError(res, 'Report failed')
  }
  return res.json()
}

export async function fetchAdminStats(token: string) {
  const res = await fetch(`${BASE}/admin/stats`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    await parseApiError(res, 'Admin access denied')
  }
  return res.json() as Promise<{ users: number; reports: number; blacklist_entries: number }>;
}

export async function fetchAdminEvents(token: string, limit = 100) {
  const res = await fetch(`${BASE}/admin/events?limit=${limit}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    await parseApiError(res, 'Could not load security events')
  }
  return res.json() as Promise<{
    events: Array<{
      id: string
      event_type: string
      severity: string
      actor: string
      target: string
      ip: string
      created_at: string
      meta: Record<string, unknown>
    }>
  }>
}

export async function fetchCaptcha() {
  const res = await fetch(`${BASE}/auth/captcha`)
  if (!res.ok) {
    await parseApiError(res, 'Could not generate captcha')
  }
  return res.json() as Promise<{ captcha_id: string; question: string }>
}

export async function scanUploadedFile(file: File, token: string): Promise<ScanResult> {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${SCAN}/file`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  })
  if (!res.ok) {
    await parseApiError(res, 'File scan failed')
  }
  return res.json()
}

export async function fetchTOTPStatus(token: string) {
  const res = await fetch(`${BASE}/auth/2fa/status`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    await parseApiError(res, 'Could not fetch 2FA status')
  }
  return res.json() as Promise<{ totp_enabled: boolean }>;
}

export async function setupTOTP(token: string) {
  const res = await fetch(`${BASE}/auth/2fa/setup`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) {
    await parseApiError(res, '2FA setup failed')
  }
  return res.json() as Promise<{ provisioning_uri: string; secret: string; totp_enabled: boolean }>;
}

export async function verifyTOTP(token: string, code: string) {
  const body = new FormData()
  body.append('code', code)
  const res = await fetch(`${BASE}/auth/2fa/verify`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  })
  if (!res.ok) {
    await parseApiError(res, '2FA verification failed')
  }
  return res.json()
}

export async function disableTOTP(token: string, code: string) {
  const body = new FormData()
  body.append('code', code)
  const res = await fetch(`${BASE}/auth/2fa/disable`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body,
  })
  if (!res.ok) {
    await parseApiError(res, '2FA disable failed')
  }
  return res.json()
}
