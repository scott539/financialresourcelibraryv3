# Resource Library Kit gate: isolated setup

## Baseline and rollback

Production baseline: `cdfcf028d8c83a495f20d5772a68c357d38d4f9b`.
Work branch: `codex/library-gate`.

The initial setup commit added a read-only build check and server-side test configuration.
That initial setup did not change download handling, the signup popup, resource ranking, analytics,
WordPress content, cookies, subscribers, tags, forms, automations or email delivery.
The isolated runtime test extension is documented below.
The check cannot write to Kit and is not exposed through an HTTP endpoint.

`KIT_API_KEY` is a Vercel Secret scoped to Preview / `codex/library-gate`.
`KIT_TEST_EMAIL` is server-side configuration containing the one address provided
by the owner. Do not commit the address, print it in build logs, expose it as a
Vite variable, or expand the allowlist without authorization.
`KIT_SETUP_CHECK=1` opts in to the read-only build check on that branch only.
Normal production builds skip it even if the flag were accidentally present.

Rollback: set `KIT_SETUP_CHECK=0` or remove the branch's setup variables and
redeploy that preview. Production has no gate or new deployment to roll back.
Never revoke an unrelated key or remove existing subscriber tags.

## Next steps before sending a test email

1. Confirm the saved key can list forms, without reading any subscribers.
2. Create a separate Kit form named `BPM Resource Library — Test` with email
   confirmation enabled and auto-confirm disabled. Keep it out of all existing
   automations and sequences. Do not reuse the current production signup form.
3. Verify the confirmation and returning-subscriber access mechanism. A Kit
   subscriber's `active` state or form subscription alone is not proof that the
   person entering the email owns it. Never use a submitted email or a raw
   `subscriber_id` as authorization.
4. Prepare a test-only, explicitly invoked send path with a persistent rate limit,
   one-time verification token and exact-address restriction. Builds must never
   send emails. Only the owner's approved test inbox may receive setup messages.
5. Verify the first-party WordPress session / embedded app bridge in Safari;
   existing browser-stored email is unverified. Do not require third-party cookies.
6. Test cumulative resource tags, unsubscribed-address behavior and rollback
   before proposing public activation. Use dedicated test tags, not existing tags.

## Intended behavior

- Catalog, previews and calculators stay public. Gate file downloads and copy-link
  actions once per verified browser session.
- Maintain distinct events for delivered downloads, copy links opened and tools
  opened; do not infer a completed copy or calculation.
- Keep historical aggregate download/open counts separate from subscriber tags.
- Keep a single off switch that restores the existing public download path.
- Original public storage / Drive URLs mean this is a signup gate, not DRM.

## Verified references

- https://developers.kit.com/api-reference/authentication
- https://developers.kit.com/api-reference/forms/list-forms
- https://developers.kit.com/api-reference/forms/add-subscriber-to-form
- https://help.kit.com/en/articles/7896769-how-to-customize-your-kit-subscribers-experience-on-your-wordpress-website

## Isolated end-to-end test implementation (October 31)

The branch now includes an admin-only WordPress test bridge and a separately
flagged `/api/gated-resource` endpoint. The earlier build diagnostic remains GET
only; it may look up the single approved test subscriber's state and emits no
subscriber identity. Runtime test tag writes are separate from that diagnostic.

`KIT_GATE_TEST=1` on Preview / `codex/library-gate` enables the test buttons and
runtime endpoint. Production builds and production API requests are hard-disabled
regardless of this flag. No existing download API, ledger or historical counts
were changed. All normal calculator links remain ungated.

`wordpress/library-gate-test.php` installs as a NEW WPCode PHP snippet. It adds
Tools → Library Gate Test, accessible only to WordPress administrators. The
configuration accepts only the hash-matched owner-approved test email and a
project preview URL. It uses the existing Kit OAuth connection, with debugging
turned off, to send/verify a one-time login code. Browser identity comes from
Kit's verified code, never from an active status, submitted email, URL or old
localStorage value. A random 30-day HttpOnly/Secure/SameSite=Lax first-party cookie
references a server-side session. No Kit token is exposed to the iframe.

The parent test page issues resource/action-bound, 120-second, one-use tokens to
its exact preview iframe. The Vercel endpoint redeems the token server-to-server,
then checks that Kit still reports the exact approved test subscriber as active.
Only then does it fetch a known catalog file or Google copy URL. Test tags use
`BPM Library Test: Downloaded: <title>` or
`BPM Library Test: Copy link opened: <title>` and are additive/idempotent.
A copy tag means the copy-dialog link was requested, not that a copy was made.
A download tag means the server verified a file for delivery, not proof the user
saved or used it. Delivery failure never produces a download tag. Tag failures
are shown as such; no automatic retry queue exists in this test version.

Rollback: disable the NEW WordPress snippet and set `KIT_GATE_TEST=0`, then
redeploy the preview. Public library behavior is unchanged throughout. No old
snippet or WordPress content is overwritten. Existing tags are never removed.
Test sessions expire in 30 days and grants in two minutes. Do not merge or enable
public gating until the remaining acceptance checks pass.

Pending acceptance: live code verification, successful file delivery, second
resource cumulative tags, repeat-login persistence, logout, blocked/unsubscribed
handling, physical iPhone/Safari checks, and a deliberate public signup design
with the intended form/consent wording. This admin-only harness is not the final
public signup screen. The public Kit test form already passed double opt-in.
