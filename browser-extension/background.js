const API_BASE = "http://127.0.0.1:8000/api/v1/scan/url";
const CACHE_TTL_MS = 5 * 60 * 1000;
const cache = new Map();

function fromCache(url) {
  const hit = cache.get(url);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(url);
    return null;
  }
  return hit.data;
}

async function scanUrl(url) {
  const cached = fromCache(url);
  if (cached) return cached;

  const response = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error("Scan API unavailable");
  }

  const data = await response.json();
  cache.set(url, { data, at: Date.now() });
  return data;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== "SCAN_LINK" || !message?.url) {
    sendResponse({ ok: false, error: "invalid_request" });
    return;
  }

  scanUrl(message.url)
    .then((result) => {
      const blocked =
        result.risk_level === "high_risk" ||
        result.risk_level === "suspicious" ||
        result.score >= 50;
      sendResponse({
        ok: true,
        blocked,
        result: {
          risk_level: result.risk_level,
          score: result.score,
          summary: result.summary,
        },
      });
    })
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error.message || "scan_failed",
      });
    });

  return true;
});
