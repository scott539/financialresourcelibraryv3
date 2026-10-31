# Resource image refresh — 2026-10-31

Replaces 10 generic or misleading thumbnails and reworks 6 cramped covers for 16:9 cards. PFS, Vision & Goal Setting, Mortgage Payoff, DEWK Family Plan, Bitcoin's Binary Endgame, and the archived 2025 checklist retain their original images.

## Original backup

Before this release, all 22 original image files were downloaded unchanged and saved in `BPM-Resource-Library-Original-Images-2026-10-31.zip`, including an image manifest with resource IDs, original URLs, dimensions, and SHA-256 checksums. The archive is saved with the owner's project files. No original Firebase Storage object was overwritten or deleted.

`data/catalog-images.json` also records the original URL and checksum for each changed image, alongside its replacement path. New images are versioned in `public/resource-images/2026-10-31/` as 1200×675 WebP files.

## Application and future editing

`applyCatalogImage` changes only a resource whose ID and image URL both match the reviewed original. It runs through the existing catalog read pipeline, covering cards, previews, individual resource pages, and embeds. New admin image uploads take precedence. Counts, resource files, metadata, ordering, and featured status are unchanged.

Images on wide embeds and individual resource pages use `object-contain` to preserve text and composition. Standard library cards retain their 16:9 media frame.

## Rollback

To restore one original before any subsequent admin edits, remove its entry from `data/catalog-images.json` and redeploy. If an admin has saved the new URL to Firestore in the meantime, restore that resource's `imageUrl` to the manifest's `originalUrl` as well. Keep new static image files available if any catalog document references them. To revert the whole release, revert the image-refresh commit and restore any explicitly saved replacement URLs using this manifest.

## Validation

The catalog tests verify every image mapping, valid assets, retained originals, idempotence, and precedence of new administrator uploads. Run `node --test tests/*.test.mjs`, `npm run lint`, and `npm run build`. Inspect desktop and narrow cards, a preview, and a wide embed before completing release verification.
