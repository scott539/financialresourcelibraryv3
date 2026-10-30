// Load on successful public WordPress tool pages under the same analytics
// consent trigger as the existing GA4 page view. Do not install inside iframes.
(() => {
  if (window.top !== window || window.__bpmToolPageviewSent ||
      !['biggerpocketsmoney.com','www.biggerpocketsmoney.com'].includes(location.hostname) ||
      document.body.classList.contains('error404') || !document.body.classList.contains('page') ||
      document.documentElement.dataset.bpmAnalyticsConsent !== 'granted') return;
  const script = document.currentScript;
  if (!script || !window.crypto?.randomUUID) return;
  const endpoint = new URL('/api/usage', script.src).href;
  const eventId = crypto.randomUUID();
  window.__bpmToolPageviewSent = true;
  const body = JSON.stringify({ path: location.pathname, eventId });
  async function send() {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body, credentials: 'omit', referrerPolicy: 'no-referrer', keepalive: true });
        if (r.ok || r.status < 500) return;
      } catch { /* Retry the same receipt. */ }
    }
  }
  void send();
})();
