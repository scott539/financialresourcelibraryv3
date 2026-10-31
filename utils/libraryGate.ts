import { canonicalId, isFile } from './usage';
import type { Resource } from '../types';
export type GateAction = 'downloads' | 'copyOpens';
export const gatePreview = typeof __BPM_KIT_GATE_PREVIEW__ !== 'undefined' && __BPM_KIT_GATE_PREVIEW__;
export function shouldGate(resource: Resource) { return gatePreview && isFile(resource.id) && !resource.isComingSoon; }
const parentOrigin = 'https://biggerpocketsmoney.com';
export function requestGateGrant(id: string, action: GateAction): Promise<string> {
  return new Promise((resolve,reject)=> {
    if (window.parent === window) return reject(Error('Open the WordPress Library Gate Test page to verify your subscription.'));
    const requestId = crypto.randomUUID();
    const timer = window.setTimeout(()=>finish(null, 'The WordPress test page did not respond. Refresh the test page and try again.'),15000);
    function finish(token: string | null, error?: string) {
      window.clearTimeout(timer); window.removeEventListener('message',receive);
      token ? resolve(token) : reject(Error(error || 'Use the login form above the test library, then try again.'));
    }
    function receive(event: MessageEvent) {
      if (event.source !== window.parent || event.origin !== parentOrigin || event.data?.type !== 'bpm-library-grant' || event.data.requestId !== requestId) return;
      finish(typeof event.data.token === 'string' ? event.data.token : null);
    }
    window.addEventListener('message',receive);
    window.parent.postMessage({type:'bpm-library-request-grant',requestId,id,action},parentOrigin);
  });
}
export async function runGatedAction(resource: Resource, action: GateAction) {
  const id = canonicalId(resource.id);
  // Reserve a window during the user's click so mobile popup blockers cannot
  // silently block Google's copy dialog after the asynchronous login check.
  const copyWindow = action === 'copyOpens' ? window.open('about:blank','_blank') : null;
  if (action === 'copyOpens' && !copyWindow) throw Error('Allow a new tab for the Google copy dialog and try again.');
  if (copyWindow) copyWindow.opener = null;
  try {
    const token = await requestGateGrant(id,action);
    const response = await fetch('/api/gated-resource',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify({id,action})});
    if (!response.ok) {
      const problem = await response.json().catch(()=>({}));
      throw Error(problem.error || 'The resource could not be opened. Please try again.');
    }
    if (action === 'copyOpens') {
      const data = await response.json();
      if (!copyWindow) throw Error('Allow a new tab for the Google copy dialog and try again.');
      copyWindow.location.replace(data.url);
      return data.tagged === true;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = /filename="([^"]+)"/.exec(response.headers.get('Content-Disposition') || '')?.[1] || resource.fileName || 'download';
    anchor.click(); window.setTimeout(()=>URL.revokeObjectURL(url),60000);
    return response.headers.get('X-BPM-Test-Tagged') === '1';
  } catch (error) { copyWindow?.close(); throw error; }
}
