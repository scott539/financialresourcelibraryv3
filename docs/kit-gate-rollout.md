# Resource Library Kit gate: isolated setup

## Baseline and rollback

Production baseline: `cdfcf028d8c83a495f20d5772a68c357d38d4f9b`.
Work branch: `codex/library-gate`.

This commit only adds a read-only build check and server-side test configuration.
It does not change download handling, the signup popup, resource ranking, analytics,
WordPress content, cookies, subscribers, tags, forms, automations or email delivery.
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
