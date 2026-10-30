# Resource usage release

The 23-record mapping is in [usage-policy.json](../data/usage-policy.json). Five tools have verified website page views through October 29, 2026. Seventeen resources are tracked by file downloads. The remaining record is an old PFS alias. Both preview and embed URLs for it resolve to the spreadsheet that the published WordPress PFS page already embeds. The original Firebase counts are preserved in download-history.json and in the unchanged resource documents. Each file uses its legacyBaseline plus new file deliveries; the snapshot retains the original definition (downloads and opens), and the UI tooltip identifies that historical difference. The old PFS alias count is archived separately, not added to the canonical document because overlap cannot be excluded. The retired simulator and optimizer have no mapping here.

The library displays a single list. One active Featured resource can take the first position, followed by the Personal Financial Statement and the Vision/Goal Setting Template. Each appears once. Remaining matches rank by the higher of cumulative downloads (preserved history plus new deliveries) and eligible tool page views. A search or filter removes nonmatching cards, including pins. Popularity rankings freeze between changes to the search and filters.

The Money Date PDF has three verified historical GA4 download events and 937 legacy Firebase actions. The baseline uses the larger historical total, not their sum, to avoid overlap. All seventeen file resources retain their Firebase history. The frozen snapshot is never repeatedly added, and subsequent ledger increments remain separate. Visiting a document landing page or opening a Google copy dialog does not count as a download.

## Production prerequisites

The dedicated Firestore Native database is `bpm-resource-metrics` in Google project `bp-money-resources`. Keep public database access denied. The runtime uses the existing `bpm-library-metrics@bp-money-resources.iam.gserviceaccount.com` identity, its database-scoped Cloud Datastore User grant, and its Viewer grant on GA4 property `499203875`. Google service-account key creation stays disabled.

### Trust the Vercel production deployment

1. In Google Cloud, enable the Security Token Service and IAM Service Account Credentials APIs in addition to the Firestore and Google Analytics Data APIs.
2. In Vercel, confirm the Resource Library project's **OpenID Connect** settings use the **Team** issuer. In Google Cloud, create a dedicated workload identity pool with ID `bpm-vercel`. Add an OpenID Connect provider with ID `vercel`, issuer `https://oidc.vercel.com/bigger-pockets-money`, and an **allowed audience** of `https://vercel.com/bigger-pockets-money`. This is the audience in Vercel's default signed token. It differs from the Google provider resource path used at token exchange.
3. Map `google.subject` to `assertion.sub`. Add this provider condition so only the named production project can authenticate:

   ```text
   assertion.sub == 'owner:bigger-pockets-money:project:financialresourcelibraryv3:environment:production' &&
   assertion.project_id == 'prj_I5ctkoNMI5kIIMTQ5OnmHpWBUhZT'
   ```

4. In the service account's **Permissions** tab, grant **Workload Identity User** on this one service account to the exact principal below. The pool is dedicated to this provider.

   ```text
   principal://iam.googleapis.com/projects/272224588349/locations/global/workloadIdentityPools/bpm-vercel/subject/owner:bigger-pockets-money:project:financialresourcelibraryv3:environment:production
   ```

The app reads the short-lived Vercel token from the current function request. Google validates it, then issues a scoped credential for GA4 or Firestore. Tokens and private keys do not appear in the catalog, logs, or configuration below. Preview branches show the historical baseline and cannot use this runtime configuration. For a live pre-release check, use a reviewed, protected staged production deployment before assigning the public domain.

[Google workload identity federation](https://cloud.google.com/iam/docs/workload-identity-federation) · [Vercel's Google Cloud guide](https://vercel.com/docs/oidc/gcp)

Set these server-only Vercel variables for the production environment.

| Setting | Value |
| --- | --- |
| BPM_GCP_WIF_PROVIDER | `projects/272224588349/locations/global/workloadIdentityPools/bpm-vercel/providers/vercel` |
| BPM_METRICS_DATABASE | `bpm-resource-metrics` |
| BPM_GA_TIMEZONE | Exact reporting timezone from the website GA4 property |
| BPM_DOWNLOAD_START | First enabled download-tracking day in that timezone, YYYY-MM-DD |
| CRON_SECRET | Random server-only bearer secret for the nightly Vercel Cron |

Redeploy after changing environment variables. Keep the start date stable after enabling. The private `receipts` collection can have a Firestore TTL policy on `expiresAt`. The nightly job backfills from October 30 in chunks of up to 28 calendar days, revisits the previous three days, and replaces GA4 daily totals in a transaction. Re-run the authenticated job to catch up a longer backlog. If timezone, coverage, or reporting access fails, the job does not substitute zeros for the missing report. File receipts and GA tool views are never added to one another. The original resource downloadCount fields are not rewritten; new activity goes to the dedicated metrics ledger. Public totals poll every five seconds while visible. Requests with the same receipt are idempotent. Explicit QA requests use measure=0.

## WordPress handoff

The optional [WordPress integration](../wordpress/bpm-resource-usage.php) is not active until installed. Test it on the intended production-equivalent site first. It recognizes the published tool page IDs, suppresses preview/error screens, and retains the old PFS shortcut. The site's analytics-consent provider must expose WordPress statistics consent or dispatch `bpm:analytics-consent` with a boolean on initialization and each consent change. Verify the site CMP contract and run the test in both consent states. The analytics script fails closed without a grant. An embedded resource card gets consent only from the production WordPress origin. Anonymous server-side file-delivery totals work in the standalone library and WordPress embeds without that analytics signal. Only explicitly requested binary files with a one-request receipt count; no visitor ID, cookie, email, or financial input is stored in these receipts. An explicit parent consent denial and preview builds set measure=0. Google copy tracking and tool pageview analytics still require a consent grant. The visitor's financial inputs, email, query parameters, and referrer are never part of counter receipts.

Direct tool traffic is counted at eligible WordPress destinations. The server checks file delivery against the canonical public resource document. Eligible first-party file links and the known Money Date podcast PDF can use the same endpoint. Older links on uncontrolled sites, Google copy dialogs, and files served outside this route cannot be inferred as downloads. Large or unverified payloads open their original destination without a download increment. These are counts of verified file requests, not proof that a user saved a file to disk. A card or landing-page view cannot record a file delivery.

## Checks

Run `node --test tests/usage.test.mjs` with Node 22.15+ or 24. The tests run the real page tracker and request handlers with isolated database and file adapters. They check direct views, retries, consent, PFS page and file requests, copy links, ambiguous payloads, and GA reconciliation. The protected preview can be viewed through the pull request. Before promoting, verify the federated read and write on a reviewed staged production build, exercise the WordPress consent integration, and confirm the first GA4 backfill. Removing the WordPress integration and redeploying the prior app commit rolls back collection and display without altering the original resource records.
