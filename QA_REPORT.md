# Test and QA Report — Idea Jar v1.0

**Date:** 2026-07-12
**Tester:** Build agent + automated validation

## Automated test results

| Suite | Tests | Passed | Failed | Notes |
|-------|-------|--------|--------|-------|
| picker.test.ts | 11 | 11 | 0 | Weighted random, eligibility, filtering, persisted history, repeat avoidance, snooze, deterministic random injection |
| export.test.ts | 22 | 22 | 0 | Markdown export, strict processing/backup validation, draw-history restore, and import diff behavior |
| useToast.test.tsx | 1 | 1 | 0 | Shared app-level success/error notification state |

**Total: 34 tests, 0 failures.**

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
| 3 | Records survive reloads and app updates | ✅ | IndexedDB persists across sessions; schema is versioned |
| 4 | Core functionality works offline after first online visit | ✅ | Vite PWA plugin with service worker precaches assets; no runtime network deps |
| 5 | Business exports never contain personal activities by default | ✅ | Business export only uses `businessCaptures` from context; `buildMarkdownExport` filters by type |
| 6 | App never creates an official Idea ID | ✅ | Local IDs are `CAP-YYYYMMDD-NNN`; regex validation rejects non-IDEA-### IDs on import |
| 7 | Exporting does not delete or silently change a capture | ✅ | Export marks state as `exported`; capture remains in DB |
| 8 | Full backup, clear test data, and restore reproduce original records without duplicate UUIDs | ✅ | Records and draw history restore transactionally; merge preserves existing immutable IDs |
| 9 | Invalid imports cause no data change | ✅ | Every record and history event is validated before the transactional preview/apply flow |
| 10 | Picker returns only eligible items | ✅ | `isEligible` filters out completed/archived/paused/snoozed |
| 11 | Picker avoids immediate repeat when at least two eligible items exist | ✅ | Tested in picker.test.ts |
| 12 | Empty result explains how to broaden the choice | ✅ | `noExactMatch` state shows reason + suggestions |
| 13 | Keyboard navigation, labels, focus, contrast, reduced motion | ✅ | Semantic navigation, labeled controls, trapped/restored dialog focus, Escape close, focus-visible styles, and reduced motion |
| 14 | Production build has no console errors | ✅ | Build output clean; interactive browser walkthrough reported no warning/error logs |
| 15 | Manifest, icons, service worker, and update flow work correctly | ✅ | Generated manifest/service worker/icons verified; offline-ready and user-controlled update prompts exercised |
| 16 | Deployed app loads correctly under GitHub repository subpath | ✅ | `base: '/idea-incubator-companion/'` in vite.config.ts; HashRouter for refreshes |
| 17 | Phone and desktop layouts receive manual QA | ✅ | Checked at the default desktop viewport and 390×844; no horizontal overflow and bottom navigation remained usable |
| 18 | No real user content, secret, token, analytics, or remote tracking | ✅ | Privacy audit: no API keys, no analytics scripts, no external CDN, no fetch to third parties |

## Interactive browser walkthrough

- Captured a sample activity and business idea and confirmed visible success messages.
- Drew an Activity Jar result and confirmed the persisted picker flow.
- Exercised Markdown export state changes and invalid processing-result rejection.
- Verified dialog initial focus, Escape close, focus return, and labeled edit fields.
- Exercised the offline-ready prompt and a user-approved service-worker update.
- Checked desktop and 390×844 responsive layouts with no browser console warnings or errors.

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

## Recommended next action

**Test the PWA on a real phone.** Install it via "Add to Home Screen", go offline, capture a few ideas, pick an activity, and export a Markdown file. Verify the exported file reads correctly and the processing instructions are clear.
