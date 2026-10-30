// Install on public WordPress pages. The site's consent integration sets or clears
// data-bpm-analytics-consent on <html> together with its analytics tag.
(() => {
  if (window.top !== window || !['biggerpocketsmoney.com','www.biggerpocketsmoney.com'].includes(location.hostname)) return;
  const app = 'https://financialresourcelibraryv3.vercel.app';
  const granted = () => document.documentElement.dataset.bpmAnalyticsConsent === 'granted';
  function publish() {
    for (const frame of document.querySelectorAll('iframe')) {
      if (frame.src.startsWith(app + '/')) frame.contentWindow?.postMessage({type:'bpm-usage-consent',granted:granted()},app);
    }
  }
  window.addEventListener('message', event => {
    if (event.origin === app && event.data?.type === 'bpm-request-usage-consent') publish();
  });
  new MutationObserver(publish).observe(document.documentElement,{attributes:true,attributeFilter:['data-bpm-analytics-consent']});
  publish();
  // Existing direct podcast PDF link. Route only this known asset when consent is granted.
  document.addEventListener('click', event => {
    const anchor = event.target.closest?.('a[href]');
    if (granted() && anchor?.href === 'https://temp-assets-dir.s3.amazonaws.com/money+date+template_v2.pdf') {
      const original = anchor.href;
      anchor.href = app + '/api/download?' + new URLSearchParams({id:'cVIAlLn6rU7pIay6ge4C',source:'podcast-pdf',measure:'1',receipt:crypto.randomUUID()});
      setTimeout(() => { anchor.href = original; }, 0);
    }
  },true);
})();
