(function () {
  function isHttpUrl(value) {
    return typeof value === "string" && /^https?:\/\//i.test(value);
  }

  function showWarning(url, result) {
    const old = document.getElementById("scamshield-warning");
    if (old) old.remove();

    const wrapper = document.createElement("div");
    wrapper.id = "scamshield-warning";
    wrapper.style.position = "fixed";
    wrapper.style.inset = "0";
    wrapper.style.zIndex = "2147483647";
    wrapper.style.background = "rgba(0,0,0,0.72)";
    wrapper.style.display = "flex";
    wrapper.style.alignItems = "center";
    wrapper.style.justifyContent = "center";

    const card = document.createElement("div");
    card.style.width = "min(92vw, 520px)";
    card.style.background = "#0b1220";
    card.style.color = "#f8fafc";
    card.style.border = "1px solid rgba(248,113,113,0.45)";
    card.style.borderRadius = "16px";
    card.style.padding = "18px";
    card.style.boxShadow = "0 20px 60px rgba(0,0,0,0.45)";
    card.innerHTML = `
      <h2 style="margin:0 0 10px 0;color:#f87171;font-size:18px;">ScamShield Warning</h2>
      <p style="margin:0 0 6px 0;font-size:14px;">This link looks dangerous and has been blocked.</p>
      <p style="margin:0 0 6px 0;font-size:13px;color:#93c5fd;"><b>Risk:</b> ${result.risk_level} (${result.score}/100)</p>
      <p style="margin:0 0 12px 0;font-size:13px;color:#cbd5e1;"><b>Reason:</b> ${result.summary}</p>
      <p style="margin:0 0 14px 0;font-size:12px;color:#94a3b8;word-break:break-all;">${url}</p>
    `;

    const buttons = document.createElement("div");
    buttons.style.display = "flex";
    buttons.style.gap = "8px";
    buttons.style.justifyContent = "flex-end";

    const closeBtn = document.createElement("button");
    closeBtn.textContent = "Close";
    closeBtn.style.background = "#1e293b";
    closeBtn.style.color = "#e2e8f0";
    closeBtn.style.border = "1px solid #334155";
    closeBtn.style.borderRadius = "10px";
    closeBtn.style.padding = "8px 12px";
    closeBtn.style.cursor = "pointer";
    closeBtn.onclick = () => wrapper.remove();

    const openBtn = document.createElement("button");
    openBtn.textContent = "Open Anyway";
    openBtn.style.background = "#7f1d1d";
    openBtn.style.color = "#fff";
    openBtn.style.border = "1px solid #b91c1c";
    openBtn.style.borderRadius = "10px";
    openBtn.style.padding = "8px 12px";
    openBtn.style.cursor = "pointer";
    openBtn.onclick = () => {
      wrapper.remove();
      window.open(url, "_blank", "noopener,noreferrer");
    };

    buttons.appendChild(closeBtn);
    buttons.appendChild(openBtn);
    card.appendChild(buttons);
    wrapper.appendChild(card);
    document.documentElement.appendChild(wrapper);
  }

  document.addEventListener(
    "click",
    (event) => {
      const anchor = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!isHttpUrl(href)) return;

      event.preventDefault();
      event.stopPropagation();

      chrome.runtime.sendMessage({ type: "SCAN_LINK", url: href }, (response) => {
        if (!response || !response.ok) {
          window.open(href, "_blank", "noopener,noreferrer");
          return;
        }

        if (response.blocked) {
          showWarning(href, response.result);
          return;
        }

        window.open(href, "_blank", "noopener,noreferrer");
      });
    },
    true
  );
})();
