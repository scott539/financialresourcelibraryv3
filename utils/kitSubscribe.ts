// Kit (ConvertKit) signup for the download modal.
//
// Kit's public form endpoint is https://app.kit.com/forms/<numeric form id>/subscriptions.
// It answers a cross-origin POST with JSON when asked to, so the modal can tell a signup
// that landed from one Kit refused or held for a spam check, and never has to guess.
// The numeric id is required: the form's uid (663c3a5c89) is not accepted on this path.

export const KIT_FORM_ID = '8946340'; // Kit "Nav Bar Signup", uid 663c3a5c89
export const KIT_SUBMIT_URL = `https://app.kit.com/forms/${KIT_FORM_ID}/subscriptions`;

export type KitResult =
  | { status: 'success' }
  // Kit held the signup for its spam check. The visitor finishes it at `url`.
  | { status: 'quarantined'; url: string }
  | { status: 'failed'; message: string };

export interface KitSignup {
  firstName: string;
  email: string;
  // The page the signup came from, stored by Kit as the subscriber's referrer.
  referrer?: string;
}

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: URLSearchParams }) =>
  Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

const GENERIC_FAILURE = "We couldn't add you to the list. Please try again.";

const isKitUrl = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && /(^|\.)(kit|convertkit)\.com$/.test(url.hostname);
  } catch {
    return false;
  }
};

export function buildKitBody(signup: KitSignup): URLSearchParams {
  const body = new URLSearchParams();
  body.set('email_address', signup.email.trim());
  body.set('fields[first_name]', signup.firstName.trim());
  if (signup.referrer) body.set('referrer', signup.referrer);
  return body;
}

export function readKitResponse(data: unknown): KitResult {
  const reply = (data && typeof data === 'object' ? data : {}) as Record<string, any>;
  if (reply.status === 'success') return { status: 'success' };
  if (reply.status === 'quarantined' && isKitUrl(reply.url)) return { status: 'quarantined', url: reply.url };
  const messages = Array.isArray(reply.errors?.messages) ? reply.errors.messages.filter((m: unknown) => typeof m === 'string') : [];
  const invalidEmail = messages.some((m: string) => /email/i.test(m));
  return { status: 'failed', message: invalidEmail ? 'Please check your email address and try again.' : GENERIC_FAILURE };
}

export async function subscribeToKit(signup: KitSignup, fetchImpl: FetchLike = fetch as unknown as FetchLike): Promise<KitResult> {
  try {
    const response = await fetchImpl(KIT_SUBMIT_URL, {
      method: 'POST',
      headers: { Accept: 'application/json' },
      body: buildKitBody(signup),
    });
    let data: unknown = null;
    try { data = await response.json(); } catch { /* not JSON: treated as a failure below */ }
    if (!response.ok && !data) return { status: 'failed', message: GENERIC_FAILURE };
    return readKitResponse(data);
  } catch {
    return { status: 'failed', message: GENERIC_FAILURE };
  }
}
