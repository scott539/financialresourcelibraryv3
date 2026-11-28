import test from 'node:test';
import assert from 'node:assert/strict';
import { KIT_SUBMIT_URL, buildKitBody, readKitResponse, subscribeToKit } from '../utils/kitSubscribe.ts';

const reply = (data, ok = true, status = 200) => async () => ({ ok, status, json: async () => data });

test('posts to the numeric Kit form endpoint, never the html_forms/<uid> path that returns 404', () => {
  assert.equal(KIT_SUBMIT_URL, 'https://app.kit.com/forms/8946340/subscriptions');
});

test('sends the field names Kit reads, and asks for JSON', async () => {
  let seen;
  await subscribeToKit({ firstName: ' Pat ', email: ' pat@example.com ', referrer: 'https://biggerpocketsmoney.com/resources/' },
    async (url, init) => { seen = { url, init }; return { ok: true, status: 200, json: async () => ({ status: 'success' }) }; });
  assert.equal(seen.url, KIT_SUBMIT_URL);
  assert.equal(seen.init.method, 'POST');
  assert.equal(seen.init.headers.Accept, 'application/json');
  assert.equal(seen.init.body.get('email_address'), 'pat@example.com');
  assert.equal(seen.init.body.get('fields[first_name]'), 'Pat');
  assert.equal(seen.init.body.get('referrer'), 'https://biggerpocketsmoney.com/resources/');
});

test('no referrer field when none is known', () => {
  assert.equal(buildKitBody({ firstName: 'Pat', email: 'pat@example.com' }).has('referrer'), false);
});

test('a success reply is a success', async () => {
  assert.deepEqual(await subscribeToKit({ firstName: 'Pat', email: 'pat@example.com' }, reply({ status: 'success', redirect_url: 'https://x.test' })), { status: 'success' });
});

test('a spam-check hold hands back the Kit page that finishes the signup', () => {
  assert.deepEqual(readKitResponse({ status: 'quarantined', url: 'https://app.kit.com/forms/guards/abc' }),
    { status: 'quarantined', url: 'https://app.kit.com/forms/guards/abc' });
});

test('a hold that points anywhere but Kit is a failure, not a link', () => {
  assert.equal(readKitResponse({ status: 'quarantined', url: 'https://evil.example/guards' }).status, 'failed');
  assert.equal(readKitResponse({ status: 'quarantined', url: 'javascript:alert(1)' }).status, 'failed');
  assert.equal(readKitResponse({ status: 'quarantined' }).status, 'failed');
});

test('a refused signup is a failure with a plain message', () => {
  const refused = readKitResponse({ status: 'failed', errors: { fields: ['email_address'], messages: ['Email address is invalid'] } });
  assert.deepEqual(refused, { status: 'failed', message: 'Please check your email address and try again.' });
  assert.equal(readKitResponse({ status: 'failed', errors: { messages: ["Form Couldn't find a form for this request"] } }).status, 'failed');
});

test('a 404, a non-JSON body and a network error are all failures, never a silent success', async () => {
  const signup = { firstName: 'Pat', email: 'pat@example.com' };
  assert.equal((await subscribeToKit(signup, reply({ error: 'Not Found' }, false, 404))).status, 'failed');
  assert.equal((await subscribeToKit(signup, async () => ({ ok: true, status: 200, json: async () => { throw new Error('not json'); } }))).status, 'failed');
  assert.equal((await subscribeToKit(signup, async () => { throw new TypeError('Failed to fetch'); })).status, 'failed');
});
