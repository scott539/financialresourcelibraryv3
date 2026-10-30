import React, { createContext, useContext, useEffect, useState } from 'react';
import catalog from '../data/usage-policy.json';
import { downloadUrl } from './downloadRequest';
type Policy = { title: string; kind?: string; baseline?: number; legacyBaseline?: number; aliasOf?: string };
const rules: Record<string, Policy> = catalog.resources;
export const canonicalId = (id: string) => rules[id]?.aliasOf || id;
export const isTool = (id: string) => rules[id]?.kind === 'views';
export const isFile = (id: string) => rules[canonicalId(id)]?.kind === 'downloads';
export const isAlias = (id: string) => Boolean(rules[id]?.aliasOf);
type Counts = { counts: Record<string, number>; rankCounts?: Record<string, number>; live: boolean; since: string | null };
const initial: Counts = { counts: Object.fromEntries(Object.entries(rules).map(([id,p]) => [id,Math.max(p.baseline || 0, p.legacyBaseline || 0)])), live:false, since:null };
const Usage = createContext(initial);
export const useUsage = () => useContext(Usage);
// An explicit denial suppresses measurement; no signal is not a denial.
// File delivery counts contain no visitor identifier or financial inputs.
let analyticsConsent: boolean | null = null;

export function UsageProvider({children}: { children: React.ReactNode }) {
  const [state,setState] = useState(initial);
  useEffect(() => {
    let disposed = false;
    let timer: number;
    async function refresh() {
      try {
        const response = await fetch('/api/usage', { cache:'no-store' });
        if (response.ok) {
          const next: Counts = await response.json();
          if (!disposed && next.counts) setState(last => !next.live && last.live ? last : next);
        }
      } catch { /* The catalog works while reporting is offline. */ }
      if (!disposed) timer = window.setTimeout(refresh, document.hidden ? 30000 : 5000);
    }
    function consent(event: MessageEvent) {
      if (event.source === window.parent && ['https://biggerpocketsmoney.com','https://www.biggerpocketsmoney.com'].includes(event.origin)
          && event.data?.type === 'bpm-usage-consent') analyticsConsent = typeof event.data.granted === 'boolean' ? event.data.granted : null;
    }
    window.addEventListener('message',consent);
    if (parent !== window) for (const origin of ['https://biggerpocketsmoney.com','https://www.biggerpocketsmoney.com'])
      parent.postMessage({type:'bpm-request-usage-consent'},origin);
    void refresh();
    return () => { disposed = true; clearTimeout(timer); window.removeEventListener('message',consent); analyticsConsent = null; };
  },[]);
  return <Usage.Provider value={state}>{children}</Usage.Provider>;
}

export function usageLabel(id: string, state: Counts) {
  const key = canonicalId(id);
  if (isTool(key)) return (state.counts[key] ?? rules[key].baseline ?? 0).toLocaleString() + ' page views';
  if (!isFile(id)) return 'Resource';
  if (rules[key].legacyBaseline) {
    return (state.counts[key] ?? rules[key].legacyBaseline).toLocaleString() + ' downloads';
  }
  if (rules[key].baseline) {
    return (state.counts[key] ?? rules[key].baseline).toLocaleString() + ' recorded downloads';
  }
  if (!state.live || !state.since) return 'Download history unavailable';
  return (state.counts[key] || 0).toLocaleString() + ' downloads since ' + state.since;
}
export function usageDescription(id: string) {
  return rules[canonicalId(id)]?.legacyBaseline
    ? 'Includes historical downloads and opens. New activity counts file downloads.'
    : undefined;
}
export function fileHref(id: string) {
  return downloadUrl(canonicalId(id), analyticsConsent, __BPM_PREVIEW__);
}

export function trackCopy(id: string, raw: string) {
  if (analyticsConsent !== true || !isFile(id)) return;
  try {
    const url = new URL(raw);
    if (url.hostname !== 'docs.google.com' || !/\/copy\/?$/.test(url.pathname)) return;
    void fetch('/api/copy', { method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:canonicalId(id),eventId:crypto.randomUUID()}), keepalive:true }).catch(() => {});
  } catch { /* A malformed document URL is not an eligible copy link. */ }
}

// Direct-open catalog entries may point either to a tool, a copy dialog or an
// actual file. Only an explicitly requested file goes through delivery verification.
export function directAction(anchor: HTMLAnchorElement, id: string) {
  if (!isFile(id)) return;
  const original = anchor.href;
  if (original.startsWith('https://firebasestorage.googleapis.com/v0/b/bp-money-resources.firebasestorage.app/o/')) {
    anchor.href = fileHref(id);
    setTimeout(() => { anchor.href = original; }, 0);
  } else {
    trackCopy(id, original);
  }
}
