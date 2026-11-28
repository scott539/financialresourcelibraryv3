// What the download modal does with a signup, kept out of the component so the tests can run it.
//
// Two rules (bpm-data #190, Codex review of PR 14):
// 1. The visitor is remembered as subscribed only when Kit says the signup succeeded. A signup
//    Kit holds for its spam check is remembered as pending, which only prefills the form next time.
// 2. A Kit reply that arrives after the modal was closed, or reopened for another resource,
//    never changes what the modal shows. True facts still get recorded: the lead is logged for
//    the resource it came from, and a successful signup is remembered.

import type { KitResult } from './kitSubscribe';

export type SignupView =
  | { name: 'form'; error: string }
  // "One more step": Kit wants its spam check passed before it adds the address.
  | { name: 'kitCheck'; url: string }
  // The visitor opened Kit's check. Nothing is confirmed yet, so the copy says what is left to do.
  | { name: 'checkEmail'; url: string }
  // Kit said the signup succeeded.
  | { name: 'done' };

// One counter per modal. Opening, closing or switching resource starts a new session, and a
// reply stamped with an older session is stale.
export interface ModalSession {
  begin: () => number;
  stamp: () => number;
  isCurrent: (stamp: number) => boolean;
}

export function createModalSession(): ModalSession {
  let current = 0;
  return {
    begin: () => ++current,
    stamp: () => current,
    isCurrent: (stamp: number) => stamp === current,
  };
}

export interface SubmitSignupDeps {
  subscribe: () => Promise<KitResult>;
  logLead: () => Promise<void>;
  rememberSubscriber: () => void;
  rememberPending: () => void;
  clearPending: () => void;
  isCurrent: () => boolean;
  show: (view: SignupView) => void;
}

// Returns the view it showed, or 'stale' when the modal had moved on and nothing was shown.
export async function submitSignup(deps: SubmitSignupDeps): Promise<SignupView['name'] | 'stale'> {
  const result = await deps.subscribe();
  if (result.status === 'failed') {
    if (!deps.isCurrent()) return 'stale';
    deps.show({ name: 'form', error: result.message });
    return 'form';
  }

  // Kit took the signup, or is holding it for its check. Either way the lead is real.
  await deps.logLead();

  if (result.status === 'quarantined') {
    deps.rememberPending();
    if (!deps.isCurrent()) return 'stale';
    deps.show({ name: 'kitCheck', url: result.url });
    return 'kitCheck';
  }

  deps.clearPending();
  deps.rememberSubscriber();
  if (!deps.isCurrent()) return 'stale';
  deps.show({ name: 'done' });
  return 'done';
}

// The visitor tapped "Finish signing up". Kit's check opens in a new tab and this page never
// hears how it went, so the modal says what is left to do and remembers nothing new.
export function openKitCheck(view: SignupView, show: (view: SignupView) => void): void {
  if (view.name !== 'kitCheck') return;
  show({ name: 'checkEmail', url: view.url });
}
