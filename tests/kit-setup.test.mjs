import test from 'node:test';
import assert from 'node:assert/strict';
import { kitTestConfig, isAllowedTestEmail } from '../server/kit-config.js';
import { checkKitSetup } from '../scripts/check-kit-setup.mjs';

const env = {
  VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'codex/library-gate',
  KIT_SETUP_CHECK: '1', KIT_API_KEY: 'test-only-not-a-credential',
  KIT_TEST_EMAIL: 'owner+test@example.com',
};
const reply = (data) => ({ ok: true, json: async () => data });

test('production, unrelated previews and disabled configuration make zero requests', async () => {
  for (const override of [{ VERCEL_ENV: 'production' }, { VERCEL_GIT_COMMIT_REF: 'other' }, { KIT_SETUP_CHECK: '0' }]) {
    const result = await checkKitSetup({ env: { ...env, ...override }, request: () => assert.fail('must not contact Kit') });
    assert.equal(result.status, 'skipped');
  }
  assert.equal(kitTestConfig(env).publicGateEnabled, false);
  assert.equal(kitTestConfig(env).allowWrites, false);
});

test('test address match is exact, preserves plus alias and never permits a production request', () => {
  assert.equal(isAllowedTestEmail(' OWNER+TEST@EXAMPLE.COM ', env), true);
  for (const address of ['owner@example.com', 'other@example.com', '', null]) assert.equal(isAllowedTestEmail(address, env), false);
  assert.equal(isAllowedTestEmail(env.KIT_TEST_EMAIL, { ...env, VERCEL_ENV: 'production' }), false);
  assert.equal(kitTestConfig({ ...env, KIT_TEST_EMAIL: 'one@example.com,two@example.com' }).testEmail, null);
});

test('GET-only connection check follows pagination and returns no secrets or subscriber data', async () => {
  const calls = [];
  const result = await checkKitSetup({ env, request: async (url, options) => {
    calls.push({ url: String(url), options });
    return calls.length === 1 ? reply({ forms: [{ uid: '2f902835bb', name: 'Private unrelated name' }], pagination: { has_next_page: true, end_cursor: 'next' } }) :
      reply({ forms: [{ id: 123, uid: 'abcdef', name: 'BPM Resource Library — Test' }], pagination: { has_next_page: false } });
  }});
  assert.equal(calls.length, 2);
  assert.equal(new URL(calls[1].url).searchParams.get('after'), 'next');
  for (const call of calls) {
    assert.equal(new URL(call.url).origin, 'https://api.kit.com');
    assert.equal(call.options.method, 'GET');
    assert.equal(call.options.redirect, 'error');
    assert.equal(call.options.body, undefined);
    assert.equal(call.options.headers['X-Kit-Api-Key'], env.KIT_API_KEY);
  }
  assert.equal(result.status, 'connected');
  assert.equal(result.legacyFormFound, true);
  assert.deepEqual(result.testForms, [{ id: 123, uid: 'abcdef' }]);
  for (const privateText of [env.KIT_API_KEY, env.KIT_TEST_EMAIL, 'Private unrelated name']) assert.equal(JSON.stringify(result).includes(privateText), false);
});

test('missing settings, authentication errors and exceptions cannot expose secrets', async () => {
  await assert.rejects(checkKitSetup({ env: { ...env, KIT_API_KEY: '' }, request: () => assert.fail('no request') }), /missing/);
  await assert.rejects(checkKitSetup({ env: { ...env, KIT_TEST_EMAIL: '' }, request: () => assert.fail('no request') }), /one test address/);
  await assert.rejects(checkKitSetup({ env, request: async () => ({ ok: false, status: 401 }) }), /^Error: Kit read-only connection check returned HTTP 401\.$/);
  await assert.rejects(checkKitSetup({ env, request: async () => { throw new Error(env.KIT_API_KEY); } }), /^Error: Kit read-only connection check failed; no changes were made\.$/);
});
