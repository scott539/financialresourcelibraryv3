# Resource usage release

The 23-record mapping is in [usage-policy.json](../data/usage-policy.json). Five tools have verified website page views through October 29, 2026. Seventeen file resources share the downloads section. The remaining record is an old PFS alias. Both preview and embed URLs for it resolve to the spreadsheet that the published WordPress PFS page already embeds. The app keeps legacy database counts separate from these public statistics. The retired simulator and optimizer have no mapping here.

The Money Date PDF has three verified historical GA4 download events. The other files have no verified historical total. A Google copy dialog has its own private event and cannot increase a download total. Rankings freeze between changes to the search and filters. Both sections remain searchable together.

## Production prerequisites

Use a dedicated Firestore Native database, for example `bpm-resource-metrics`, in Google project `bp-money-resources`. Keep public client access to that database denied. The runtime service account needs Cloud Datastore User scoped to this database and Viewer access to GA4 property `499203875`. Enable the Google Analytics Data and Firestore APIs. A proposed service-account name is `bpm-library-metrics@bp-money-resources.iam.gserviceaccount.com`; it has not been provisioned by this code. The catalog database is read only via its public resource documents. The metrics server refuses the default database.

Set the following server-only Vercel variables in the applicable environment. Add Google's service account credential directly in Vercel as a sensitive variable. Never put it in source control, a browser variable, or chat.

| Setting | Value |
| --- | --- |
| BPM_METRICS_GOOGLE_JSON | Credential for the dedicated service account |
| BPM_METRICS_DATABASE | Dedicated Firestore database ID |
| BPM_GA_TIMEZONE | Exact reporting timezone from the website GA4 property |
| BPM_DOWNLOAD_START | First enabled download-tracking day in that timezone, YYYY-MM-DD |
| CRON_SECRET | Random server-only bearer secret for the nightly Vercel Cron |
 
Redeploy after changing environment variables. Keep the start date stable after enabling. Preview and production use separate collection names. The private `receipts` collection can have a Firestore TTL policy on `expiresAt`. The nightly job backfills from October 30 in chunks of up to 28 calendar days, revisits the previous three days, and replaces GA4 daily totals in a transaction. Re-run the authenticated job to catch up a longer backlog. If timezone, coverage, or reporting access fails, the job does not substitute zeros for the missing report. File receipts and GA tool views are never added to one another.

## WordPress handoff

The optional [WordPress integration](../wordpress/bpm-resource-usage.php) is not active until installed. Test it on the intended production-equivalent site first. It recognizes the published tool page IDs, suppresses preview/error screens, and retains the old PFS shortcut. The site's analytics-consent provider must expose WordPress statistics consent or dispatch `bpm:analytics-consent` with a boolean on initialization and each consent change. Verify the site CMP contract and run the test in both consent states. The script fails closed without a grant. An embedded resource card gets consent only from the production WordPress origin. Standalone library visits with no consent signal still deliver the file. The visitor's financial inputs, email, query parameters, and referrer are never part of counter receipts.

Direct tool traffic is counted at eligible WordPress destinations. The server checks file delivery against the canonical public resource document. Eligible first-party file links and the known Money Date podcast PDF can use the same endpoint. Older links on uncontrolled sites, Google copy dialogs, and files served outside this route cannot be inferred as downloads. Large or unverified payloads open their original destination without a download increment. These are counts of verified file requests, not proof that a user saved a file to disk. A card or landing-page view cannot record a file delivery.

## Checks

Run `node --test tests/usage.test.mjs` with Node 22.15+ or 24. The tests run the real page tracker and request handlers with isolated database and file adapters. They check direct views, retries, consent, PFS page and file requests, copy links, ambiguous payloads, and GA reconciliation. The protected preview can be viewed through the pull request. Before promoting, use a configured preview database to repeat the checks against a real counter, verify the WordPress consent integration, and confirm the first GA4 backfill. Removing the WordPress integration and redeploying the prior app commit rolls back collection and display without altering the original resource records.
