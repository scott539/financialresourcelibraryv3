import { kitTestConfig } from './kit-config.js';
import { policy } from './policy.js';
import { libraryResourceTag } from './kit-subscriber.js';

export const bridgeUrl = 'https://biggerpocketsmoney.com/wp-json/bpm-library-test/v1/redeem';
export function gateEnabled(env = process.env) {
  const c = kitTestConfig(env);
  return c.isolatedPreview && !!c.testEmail && !!env.KIT_API_KEY && env.KIT_GATE_TEST === '1';
}
async function kit(path, { method = 'GET', body, env, request }) {
  let res;
  try {
    res = await request('https://api.kit.com/v4/' + path, {
      method, headers: { 'X-Kit-Api-Key': env.KIT_API_KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}), redirect: 'error', signal: AbortSignal.timeout(12000)
    });
  } catch { throw Error('Kit connection unavailable.'); }
  if (!res.ok) throw Error('Kit request unavailable.');
  return res.status === 204 ? {} : res.json();
}
export async function authorizeGate({ token, id, action, env = process.env, request = fetch }) {
  if (!gateEnabled(env) || !/^[a-f0-9]{64}$/.test(token || '') ||
      !['downloads','copyOpens'].includes(action) || policy.resources[id]?.kind !== 'downloads') throw Error('Access required.');
  let result;
  try {
    const response = await request(bridgeUrl, { method: 'POST', redirect:'error',
      headers: { 'Content-Type':'application/json' }, body: JSON.stringify({ token, id, action }), signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw Error();
    result = await response.json();
  } catch { throw Error('Access required.'); }
  if (!/^\d+$/.test(String(result.subscriberId)) || result.id !== id || result.action !== action) throw Error('Access required.');
  const { subscriber } = await kit('subscribers/' + result.subscriberId, { env, request });
  if (!subscriber || String(subscriber.id) !== String(result.subscriberId) || subscriber.state !== 'active' ||
      subscriber.email_address?.toLowerCase() !== kitTestConfig(env).testEmail) throw Error('Confirmed test subscription required.');
  return String(subscriber.id);
}
export async function tagGateAction({ subscriberId, id, action, env = process.env, request = fetch }) {
  if (!gateEnabled(env) || !/^\d+$/.test(String(subscriberId)) || policy.resources[id]?.kind !== 'downloads' ||
      !['downloads','copyOpens'].includes(action)) throw Error('Test tagging disabled.');
  // Recheck the address/state before every mutation. Never subscribe or reactivate.
  const { subscriber } = await kit('subscribers/' + subscriberId, { env, request });
  if (subscriber?.state !== 'active' || subscriber.email_address?.toLowerCase() !== kitTestConfig(env).testEmail ||
      String(subscriber.id) !== String(subscriberId)) throw Error('Test tagging disabled.');
  const name = libraryResourceTag({ id, title: policy.resources[id].title }, action);
  // Kit returns the existing tag when the name already exists. The dedicated
  // Test prefix is never used by a production automation created by this app.
  const { tag } = await kit('tags', { method:'POST', body:{name}, env, request });
  if (!tag || !/^\d+$/.test(String(tag.id)) || tag.name !== name) throw Error('Tag unavailable.');
  await kit(`tags/${tag.id}/subscribers/${subscriberId}`, { method:'POST', body:{}, env, request });
}
