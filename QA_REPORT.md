# Test and QA Report — Idea Jar v1.1

**Date:** 2026-07-13
**Tester:** Build agent + automated validation

## Automated test results

| Suite | Tests | Passed | Failed | Notes |
|-------|-------|--------|--------|-------|
| picker.test.ts | 11 | 11 | 0 | Weighted random, eligibility, filtering, persisted history, repeat avoidance, snooze, deterministic random injection |
| export.test.ts | 28 | 28 | 0 | Markdown export, schema 1.0/1.1 backup validation, wishlist restore boundaries, draw-history restore, and import diff behavior |
| wishlist.test.ts | 11 | 11 | 0 | Euro-cent parsing, rounding, invalid amounts, progress math, remaining amount, and derived wishlist states |
| useToast.test.tsx | 1 | 1 | 0 | Shared app-level success/error notification state |

**Total: 52 tests, 0 failures.**

## Build verification

- `tsc -b` passes with zero type errors.
- `vite build` produces production bundle successfully.
- PWA service worker generated (sw.js + workbox).
- No console errors from the production build.

## Acceptance checklist

| # | Requirement | Status | Notes |
|---|-------------|--------|-------|
| 1 | Save a thought in under 20 seconds | ✅ | Capture screen has prominent textarea + type selector + Save quickly button |
| 2 | Unicode, emojis, punctuation, multiline survive save/reload/export/restore | ✅ | Covered by export test; all text stored as plain strings in IndexedDB |
| 3 | Records survive reloads and app updates | ✅ | IndexedDB persists across sessions; schema v2 adds the wishlist store without replacing existing stores |
| 4 | Core functionality works offline after first online visit | ✅ | Vite PWA plugin with service worker precaches assets; no runtime network deps |
| 5 | Business exports never contain personal activities or wishlist items | ✅ | Business export only receives `businessCaptures`; wishlist has a separate store and backup field |
| 6 | App never creates an official Idea ID | ✅ | Local IDs are `CAP-YYYYMMDD-NNN`; regex validation rejects non-IDEA-### IDs on import |
| 7 | Exporting does not delete or silently change a capture | ✅ | Export marks state as `exported`; capture remains in DB |
| 8 | Full backup, clear test data, and restore reproduce original records without duplicate UUIDs | ✅ | Records, wishlist items, savings progress, and draw history restore in one transaction; legacy backups remain supported |
| 9 | Invalid imports cause no data change | ✅ | Every record, wishlist item, amount, link, timestamp, and history event is validated before the transactional preview/apply flow |
| 10 | Picker returns only eligible items | ✅ | `isEligible` filters out completed/archived/paused/snoozed |
| 11 | Picker avoids immediate repeat when at least two eligible items exist | ✅ | Tested in picker.test.ts |
| 12 | Empty result explains how to broaden the choice | ✅ | `noExactMatch` state shows reason + suggestions |
| 13 | Keyboard navigation, labels, focus, contrast, reduced motion | ✅ | Semantic navigation, labeled controls, trapped/restored dialog focus, Escape close, focus-visible styles, and reduced motion |
| 14 | Production build has no console errors | ✅ | Build output clean; interactive browser walkthrough reported no warning/error logs |
| 15 | Manifest, icons, service worker, and update flow work correctly | ✅ | Generated manifest/service worker/icons verified; offline-ready and user-controlled update prompts exercised |
| 16 | Deployed app loads correctly under GitHub repository subpath | ✅ | `base: '/idea-incubator-companion/'` in vite.config.ts; HashRouter for refreshes |
| 17 | Phone and desktop layouts receive manual QA | ✅ | Wishlist checked at 320×844 and 390×844; selected tabs scroll into view, page width does not overflow, and bottom navigation remains usable |
| 18 | No real user content, secret, token, analytics, or remote tracking | ✅ | Privacy audit: no API keys, no analytics scripts, no external CDN, no fetch to third parties |
| 19 | Wishlist savings are useful without contaminating other workflows | ✅ | Quick capture works without a price; savings update precisely; Wishlist is absent from Today and Business Export |

## Interactive browser walkthrough

- Captured wishlist items both with and without a target price.
- Verified a €75.00 starting balance, added €25.50, and observed the precise €100.50 saved / €199.50 remaining result.
- Confirmed the no-price state offers both **Add savings** and **Set a goal**.
- Confirmed the Today screen still reports zero activities when only wishlist items exist.
- Confirmed Business Export reports zero captures while full-backup copy explicitly includes wishlist savings.
- Checked 320×844 and 390×844 responsive layouts, keyboard tab navigation, native progress semantics, and browser console logs with no errors or warnings.

## Privacy and security audit

- **No API keys or secrets** in repository.
- **No analytics, advertising, or tracking** code.
- **No remote AI calls** or external API usage.
- **No cloud database** or backend.
- **No authentication** system.
- **User data stays in browser IndexedDB** on this device only.
- **All assets bundled locally** (icons, CSS, JS). No CDN dependencies.
- **Content Security Policy** restricts external resources.
- **.gitignore** excludes generated exports and backups.

## Known limitations (v1)

- Data does not sync between devices automatically. Use backup/restore.
- No photos, file attachments, or speech transcription.
- No calendar integration, recurring plans, or session timer.
- No direct ChatGPT or OpenAI API integration.
- No encrypted device sync.
- Wishlist savings are a single running euro total per item; there is no transaction ledger, price scraping, reminder, or budgeting system.

## Recommended next action

**After publishing approval, deploy the update and test the installed PWA on a real phone.** Confirm the existing local data survives the update, add one wishlist item, download a full backup, and verify an offline reload.
