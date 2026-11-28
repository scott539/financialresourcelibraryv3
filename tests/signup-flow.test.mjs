import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createModalSession, openKitCheck, submitSignup } from '../utils/signupFlow.ts';

const HOLD = { status: 'quarantined', url: 'https://app.kit.com/forms/guards/abc' };

// Runs a submitSignup-shaped function with a fake Kit and records what it did.
async function drive(submit, { reply, staleAfterKit = false }) {
  const calls = [];
  let current = true;
  const view = await submit({
    subscribe: async () => { calls.push('subscribe'); if (staleAfterKit) current = false; return reply; },
    logLead: async () => { calls.push('logLead'); },
    rememberSubscriber: () => calls.push('rememberSubscriber'),
    rememberPending: () => calls.push('rememberPending'),
    clearPending: () => calls.push('clearPending'),
    isCurrent: () => current,
    show: v => calls.push(`show:${v.name}`),
  });
  return { view, calls };
}

// Codex P2 (a): a signup Kit is holding is never remembered as a subscription, and tapping
// "Finish signing up" never shows "You're All Set!". Returns the problems found.
async function heldSignupProblems(submit, openCheck) {
  const problems = [];
  const { calls } = await drive(submit, { reply: HOLD });
  if (calls.includes('rememberSubscriber')) problems.push('a held signup was remembered as subscribed');
  if (!calls.includes('rememberPending')) problems.push('a held signup was not kept as pending');
  if (!calls.includes('show:kitCheck')) problems.push('a held signup did not show "One more step"');
  const shown = [];
  openCheck({ name: 'kitCheck', url: HOLD.url }, v => shown.push(v));
  if (shown.length !== 1 || shown[0].name !== 'checkEmail') problems.push(`"Finish signing up" showed ${shown.map(v => v.name).join(',') || 'nothing'}, not checkEmail`);
  if (shown[0]?.url !== HOLD.url) problems.push('the check-email view lost the link to Kit\'s check');
  return problems;
}

// Codex P2 (b): a Kit reply that lands after the modal moved on changes nothing on screen.
async function lateReplyProblems(submit) {
  const problems = [];
  for (const reply of [{ status: 'success' }, HOLD, { status: 'failed', message: 'x' }]) {
    const { view, calls } = await drive(submit, { reply, staleAfterKit: true });
    const shown = calls.filter(c => c.startsWith('show:'));
    if (shown.length) problems.push(`a late ${reply.status} reply showed ${shown.join(',')}`);
    if (view !== 'stale') problems.push(`a late ${reply.status} reply returned ${view}`);
  }
  return problems;
}

test('a successful signup shows "You\'re All Set!" and is remembered', async () => {
  const { view, calls } = await drive(submitSignup, { reply: { status: 'success' } });
  assert.equal(view, 'done');
  assert.deepEqual(calls, ['subscribe', 'logLead', 'clearPending', 'rememberSubscriber', 'show:done']);
});

test('a refused signup shows the error on the form and records nothing', async () => {
  const { view, calls } = await drive(submitSignup, { reply: { status: 'failed', message: 'Please check your email address and try again.' } });
  assert.equal(view, 'form');
  assert.deepEqual(calls, ['subscribe', 'show:form']);
});

test('a held signup stays pending, and "Finish signing up" says to check email instead of claiming success', async () => {
  assert.deepEqual(await heldSignupProblems(submitSignup, openKitCheck), []);
});

test('negative control: the PR 14 behaviour fails the held-signup check', async () => {
  // PR 14's click handler: remember the visitor as subscribed and jump to "You're All Set!".
  const pr14OpenCheck = (_view, show) => show({ name: 'done' });
  const pr14Submit = async deps => {
    const r = await deps.subscribe();
    if (r.status === 'failed') { deps.show({ name: 'form', error: r.message }); return 'form'; }
    await deps.logLead();
    if (r.status === 'quarantined') { deps.rememberSubscriber(); deps.show({ name: 'kitCheck', url: r.url }); return 'kitCheck'; }
    deps.rememberSubscriber(); deps.show({ name: 'done' }); return 'done';
  };
  const problems = await heldSignupProblems(pr14Submit, pr14OpenCheck);
  assert.ok(problems.some(p => /remembered as subscribed/.test(p)), problems.join('; '));
  assert.ok(problems.some(p => /not checkEmail/.test(p)), problems.join('; '));
});

test('a late Kit reply never changes the modal, but a real signup is still recorded', async () => {
  assert.deepEqual(await lateReplyProblems(submitSignup), []);
  const late = await drive(submitSignup, { reply: { status: 'success' }, staleAfterKit: true });
  assert.deepEqual(late.calls, ['subscribe', 'logLead', 'clearPending', 'rememberSubscriber']);
  const held = await drive(submitSignup, { reply: HOLD, staleAfterKit: true });
  assert.deepEqual(held.calls, ['subscribe', 'logLead', 'rememberPending']);
});

test('negative control: a flow that ignores the session fails the late-reply check', async () => {
  const unguarded = async deps => {
    const r = await deps.subscribe();
    if (r.status === 'failed') { deps.show({ name: 'form', error: r.message }); return 'form'; }
    await deps.logLead();
    if (r.status === 'quarantined') { deps.show({ name: 'kitCheck', url: r.url }); return 'kitCheck'; }
    deps.show({ name: 'done' }); return 'done';
  };
  const problems = await lateReplyProblems(unguarded);
  assert.equal(problems.length, 6, problems.join('; '));
});

test('closing or reopening the modal makes an earlier stamp stale', () => {
  const s = createModalSession();
  s.begin();
  const stamp = s.stamp();
  assert.equal(s.isCurrent(stamp), true);
  s.begin(); // closed
  s.begin(); // reopened for another resource
  assert.equal(s.isCurrent(stamp), false);
  assert.equal(s.isCurrent(s.stamp()), true);
});

test('openKitCheck does nothing outside the "One more step" view', () => {
  const shown = [];
  openKitCheck({ name: 'form', error: '' }, v => shown.push(v));
  openKitCheck({ name: 'done' }, v => shown.push(v));
  assert.deepEqual(shown, []);
});

// The component must use the flow above, not its own copy of it.
const src = readFileSync(new URL('../components/DownloadModal.tsx', import.meta.url), 'utf8');

test('the modal sends signups through submitSignup with a session guard', () => {
  assert.match(src, /await submitSignup\(\{/);
  assert.match(src, /isCurrent,\s*\n\s*show: setView/);
  assert.match(src, /session\.begin\(\);/);
  assert.match(src, /\}, \[isOpen, resource\?\.id\]\);/, 'a new session starts when the modal opens, closes or changes resource');
  assert.match(src, /finally \{\s*if \(isCurrent\(\)\) setIsSubmitting\(false\);/);
});

// Problems with how a copy of DownloadModal.tsx wires "Finish signing up" and remembers subscribers.
function finishProblems(text) {
  const problems = [];
  const finish = text.match(/<a[^>]*?onClick=\{([^}]*)[^>]*>\s*Finish signing up/);
  if (!finish) return ['no Finish signing up link'];
  if (!/^\(\) => openKitCheck\(view, setView\)$/.test(finish[1].trim())) problems.push(`Finish signing up runs ${finish[1].trim()}`);
  // Only two calls may remember a visitor: Kit's success (lead.email) and "No thanks" (the anonymous marker).
  const saves = [...text.matchAll(/saveSubscriberEmail\(([^)]*)\)/g)].map(m => m[1]).sort();
  const allowed = ["'anonymous@subscriber.direct'", 'lead.email'].sort();
  if (JSON.stringify(saves) !== JSON.stringify(allowed)) problems.push(`saveSubscriberEmail calls: ${saves.join(', ')}`);
  return problems;
}

test('"Finish signing up" goes through openKitCheck, and only Kit\'s success remembers a subscriber', () => {
  assert.deepEqual(finishProblems(src), []);
});

test('negative control: the source check catches PR 14\'s click handler', () => {
  const pr14 = src.replace('onClick={() => openKitCheck(view, setView)}',
    "onClick={() => { saveSubscriberEmail(email.trim()); setKitCheckUrl(null); setIsSubmitted(true); }}");
  assert.notEqual(pr14, src, 'the broken copy differs from the source');
  const problems = finishProblems(pr14);
  assert.ok(problems.some(p => /saveSubscriberEmail calls/.test(p)), problems.join('; '));
});
