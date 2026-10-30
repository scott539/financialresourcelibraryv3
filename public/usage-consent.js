// Install on public WordPress pages. The site's consent integration sets or clears
// data-bpm-analytics-consent on <html> together with its analytics tag.
(() => {
  if (window.top !== window || !['biggerpocketsmoney.com','www.biggerpocketsmoney.com'].includes(location.hostname)) return;
  const app = 'https://financialresourcelibraryv3.vercel.app';
  const granted = () => document.documentElement.dataset.bpmAnalyticsConsent === 'granted';
  let index;
  let loading = false;
  function publish() {
    if (granted() && !index && !loading) {
      loading = true;
      fetch(app + '/api/file-links', {credentials:'omit',referrerPolicy:'no-referrer'})
        .then(r => r.ok ? r.json() : null).then(v => { index = v; })
        .catch(() => {}).finally(() => { loading = false; });
    }
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
    if (!granted() || !anchor || !crypto.randomUUID) return;
    const original = anchor.href;
    const url = new URL(original, location.href);
    const podcast = original === 'https://temp-assets-dir.s3.amazonaws.com/money+date+template_v2.pdf';
    const id = podcast ? 'cVIAlLn6rU7pIay6ge4C' : url.origin === 'https://firebasestorage.googleapis.com' && index?.[url.pathname];
    if (!id) return;
    const query = new URLSearchParams({id,measure:'1',receipt:crypto.randomUUID()});
    if (podcast) query.set('source','podcast-pdf');
    anchor.href = app + '/api/download?' + query;
    setTimeout(() => { anchor.href = original; }, 0);
  },true);
})();
