import { pathToFileURL } from 'node:url';
import { kitTestConfig } from '../server/kit-config.js';
import { readTestSubscriberState } from '../server/kit-subscriber.js';

// Run inside Vercel's protected build environment. GET only; never log the
// credential, HTTP headers, subscriber records, or raw API/error responses.
export async function checkKitSetup({ env = process.env, request = fetch } = {}) {
  const config = kitTestConfig(env);
  if (!config.runSetupCheck) return { status: 'skipped', publicGateEnabled: false };
  if (!config.testEmail) throw new Error('KIT_TEST_EMAIL must contain one test address.');
  if (!env.KIT_API_KEY?.trim()) throw new Error('KIT_API_KEY is missing in this preview.');

  let after;
  let formsScanned = 0;
  let legacyFormFound = false;
  const testForms = [];
  for (let page = 0; page < 20; page++) {
    const url = new URL('https://api.kit.com/v4/forms');
    url.searchParams.set('per_page', '100');
    if (after) url.searchParams.set('after', after);
    let response;
    try {
      response = await request(url, {
        method: 'GET',
        headers: { Accept: 'application/json', 'X-Kit-Api-Key': env.KIT_API_KEY },
        redirect: 'error',
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new Error('Kit read-only connection check failed; no changes were made.');
    }
    if (!response.ok) throw new Error(`Kit read-only connection check returned HTTP ${response.status}.`);
    let data;
    try { data = await response.json(); }
    catch { throw new Error('Kit returned an invalid response.'); }
    if (!Array.isArray(data.forms)) throw new Error('Kit forms response was not recognized.');
    formsScanned += data.forms.length;
    for (const form of data.forms) {
      if (form.uid === '2f902835bb') legacyFormFound = true;
      if (/^BPM Resource Library\s*[—–-]\s*Test$/i.test(form.name || '')) {
        if (Number.isSafeInteger(form.id) && typeof form.uid === 'string' && /^[a-zA-Z0-9]+$/.test(form.uid)) {
          testForms.push({ id: form.id, uid: form.uid });
        }
      }
    }
    if (!data.pagination?.has_next_page) return {
      status: 'connected', formsScanned, legacyFormFound, testForms,
      testAddressConfigured: true, writesEnabled: false, publicGateEnabled: false,
      testSubscriberState: env.KIT_TEST_FORM_ID ? await readTestSubscriberState({ env, request }) : 'unchecked',
    };
    const next = data.pagination.end_cursor;
    if (typeof next !== 'string' || !next || next === after) throw new Error('Kit pagination did not advance.');
    after = next;
  }
  throw new Error('Kit setup check stopped at its pagination limit.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { console.log('[kit-setup]', JSON.stringify(await checkKitSetup())); }
  catch (error) {
    console.error('[kit-setup]', error.message);
    process.exitCode = 1;
  }
}
