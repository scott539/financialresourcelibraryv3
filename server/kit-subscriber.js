import { kitTestConfig } from './kit-config.js';

// Setup diagnostic only. Never accepts an arbitrary address from a request.
// Subscriber state is a diagnostic, not proof of browser identity.
export async function readTestSubscriberState({ env = process.env, request = fetch } = {}) {
  const config = kitTestConfig(env);
  if (!config.runSetupCheck || !config.testEmail || !env.KIT_API_KEY) return 'unchecked';
  const url = new URL('https://api.kit.com/v4/subscribers');
  url.searchParams.set('email_address', config.testEmail);
  url.searchParams.set('status', 'all');
  url.searchParams.set('slim', 'true');
  url.searchParams.set('per_page', '10');
  let response;
  try {
    response = await request(url, { method: 'GET', redirect: 'error',
      headers: { Accept: 'application/json', 'X-Kit-Api-Key': env.KIT_API_KEY },
      signal: AbortSignal.timeout(15000) });
  } catch { throw new Error('Kit test subscriber lookup failed.'); }
  if (!response.ok) throw new Error(`Kit test subscriber lookup returned HTTP ${response.status}.`);
  let data;
  try { data = await response.json(); }
  catch { throw new Error('Kit test subscriber response was invalid.'); }
  if (!Array.isArray(data.subscribers)) throw new Error('Kit test subscriber response was invalid.');
  const matches = data.subscribers.filter(s => typeof s.email_address === 'string' &&
    s.email_address.toLowerCase() === config.testEmail);
  if (matches.length !== 1) return matches.length ? 'ambiguous' : 'not_found';
  const state = matches[0].state;
  return ['active', 'inactive', 'cancelled', 'bounced', 'complained'].includes(state) ? state : 'unknown';
}

// These names are additive and dedicated to the library; they never remove an
// earlier resource association. Call only after a verified action is recorded.
export function libraryResourceTag(resource, action, { test = true } = {}) {
  const labels = { downloads: 'Downloaded', copyOpens: 'Copy link opened', opens: 'Opened' };
  if (!labels[action] || !resource?.id || typeof resource.title !== 'string' || !resource.title.trim()) {
    throw new Error('Unknown library resource action.');
  }
  return `${test ? 'BPM Library Test' : 'BPM Library'}: ${labels[action]}: ${resource.title.trim()}`;
}
