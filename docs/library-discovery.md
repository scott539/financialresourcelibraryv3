# Library discovery update — October 31, 2026

The default catalog keeps the existing Featured, Personal Financial Statement, and Goal Setting priorities, followed by the existing verified popularity score. Searches require every meaningful word and rank relevance first. File-format terms no longer admit unrelated resources. Search, topic, format, and sample-plan choices live in the app's hash-route query string and survive preview navigation, reload, and browser Back.

The public filter panel groups eight topics and five file formats, plus a Sample plans only checkbox. Audited topic corrections are guarded by resource ID, file name, and the prior tag array; later administrator edits still win. No Firestore documents, usage policies, baselines, or download handlers were changed.

The budget listing and preview describe the Household Spending Comparison Tool. The calculator URL and resource ID remain unchanged. Web-tool images and titles use the same external destination as the Open button, leaving usage measurement to destination page loads. File titles and images still open their previews.

Mobile cards use natural row heights with smaller padding and spacing, while action buttons retain 44px minimum touch targets. Embedded public previews suppress the duplicate app footer just like the catalog.

## Artwork and recovery

Two simplified marketing covers were created with the built-in image generator, then exported as 1200×675 WebP assets. The earlier images remain at their original paths in `public/resource-images/2026-10-31/`; the manifest switches only the two affected resource IDs. The complete earlier original-image archive also remains available from the prior release.

- `withdrawal-frameworks-simple.webp`: warm ivory paper, forest-green serif headline “Plan your retirement withdrawals,” one large compass/planning-document/banknote illustration; no six-card diagram, tiny labels, quantitative graphics, or extra text. Match the existing muted blue/green paper illustration style, 16:9, and keep the lower-right corner quiet for the usage badge.
- `drawdown-alternatives-simple.webp`: retain the headline “Three ways to draw down,” replace the labeled timeline grid with three broad paths in a calm blue-green paper landscape; no implied performance outcomes, rankings, numbers, or small labels. Preserve the same aspect ratio and badge-safe corner.

Restore either prior manifest image path to revert its artwork. Revert this release commit to restore the prior discovery behavior without touching historical counters or source files.

Validation: TypeScript, production build, regression tests for exact search intent, topic coverage, query round trips, direct destinations, default ordering, historical counters, and iframe scrolling. Browser acceptance covers desktop and a 390px-wide embed, combined filters, returning from previews, and image loading.
