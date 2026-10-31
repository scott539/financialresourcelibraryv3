import test from 'node:test';
import assert from 'node:assert/strict';
import { readTestSubscriberState, libraryResourceTag } from '../server/kit-subscriber.js';
const env = { VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'codex/library-gate', KIT_SETUP_CHECK: '1', KIT_API_KEY: 'test-key', KIT_TEST_EMAIL: 'test+alias@example.com' };
test('lookup filters exact test address and returns only its state', async () => {
  const state = await readTestSubscriberState({ env, request: async (url, options) => {
    assert.equal(url.searchParams.get('email_address'), env.KIT_TEST_EMAIL);
    assert.equal(options.method, 'GET');
    return { ok: true, json: async () => ({ subscribers: [
      {email_address:'other@example.com',state:'active'},
      {email_address:env.KIT_TEST_EMAIL,state:'inactive',id:123}
    ] }) };
  }});
  assert.equal(state, 'inactive');
});
test('production lookup never contacts Kit', async () => {
  assert.equal(await readTestSubscriberState({ env:{...env,VERCEL_ENV:'production'},request:()=>assert.fail('no request') }), 'unchecked');
});
test('missing subscriber fails closed; errors never echo transport credentials', async () => {
  assert.equal(await readTestSubscriberState({env,request:async()=>({ok:true,json:async()=>({subscribers:[]})})}), 'not_found');
  await assert.rejects(readTestSubscriberState({env,request:()=>{throw Error(env.KIT_API_KEY)}}), /^Error: Kit test subscriber lookup failed\.$/);
});
test('resource tags distinguish delivery, copy opens and tool opens', () => {
  const r = {id:'example',title:'Personal Financial Statement'};
  assert.equal(libraryResourceTag(r,'downloads'), 'BPM Library Test: Downloaded: Personal Financial Statement');
  assert.match(libraryResourceTag(r,'copyOpens'), /Copy link opened/);
  assert.match(libraryResourceTag(r,'opens'), /Opened/);
  assert.throws(()=>libraryResourceTag(r,'completedCopy'));
});
