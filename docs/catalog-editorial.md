# Resource catalog editorial pass — October 30, 2026

The public cards use concise, complete summaries and file-format labels derived from the uploaded filenames. The 16 uploaded binaries were retrieved and their MIME types checked; document/presentation text was inspected before rewriting claims. No files, historical counters, IDs, or destinations were replaced.

`data/catalog-editorial.json` records the known legacy values and corrected fields for the 22 public resources. `applyCatalogEditorial` applies a correction only to its audited filename and matching original field value. A newer upload or an administrator's changed value wins. This read-time correction is shared by normal catalog reads and static fallbacks; it is not a bulk Firestore write.

The 2025 checklist remains reachable through its original preview and embed URLs, with its original file and independent count. When its 2026 replacement is available, it appears under Previous editions and its preview links to the replacement. Hiding or removing the replacement restores the older item to the main list.

The 2026 checklist occupies the existing Featured slot until January 1, 2027 at 00:00 America/Denver. An administrator-selected active feature takes priority. Any later administrator edit of the 2026 record disables this one-off fallback feature; it does not override future management changes. PFS and Goal Setting remain the next two pins; all other current resources retain the existing metric ranking.

Forgotten Expenses has a Google Docs copy destination but no uploaded file. Its card and detail page offer Make a copy without a dead Download button. Copy actions retain their existing measurement policy and are not counted as successful downloads.

Validation: `npm run lint`, `npm run build`, and `node --test tests/usage.test.mjs tests/catalog-editorial.test.mjs`. The latter verifies metadata preservation, full summary rendering, download availability, feature expiry/overrides, prior-edition recovery, pin ordering, and the unchanged historical/live usage calculations.
