# Idea Jar — Incubator Companion

A calm, offline-first companion app for capturing business ideas and choosing what to do next from your Activity Jar.

**Live app:** [freddywinkel.github.io/idea-incubator-companion](https://freddywinkel.github.io/idea-incubator-companion/)

**Source:** [github.com/freddywinkel/idea-incubator-companion](https://github.com/freddywinkel/idea-incubator-companion)

## What this app does

**Idea Jar** helps you in two ways:

1. **Quickly capture business ideas** on the go, then export them as a Markdown file that ChatGPT Work (your Business Idea Incubator) can process.
2. **Maintain an Activity Jar** of hobbies, DIY projects, AI projects, learning ideas, and other small activities. When you are not sure what to do, the app suggests one thing based on your current time, energy, and mood.

The app is intentionally simple, calm, and offline-first. There are no accounts, no cloud databases, no analytics, and no tracking.

## How to install

### On a phone or tablet (recommended)

1. Open the app URL in Safari (iOS) or Chrome (Android).
2. Tap the **Share** button (Safari) or **Menu** (Chrome).
3. Choose **"Add to Home Screen"**.
4. The app installs as a standalone app with its own icon and works offline after the first visit.

### On a desktop computer

1. Open the app URL in Chrome, Edge, or Safari.
2. In the address bar, look for an **install icon** (usually a plus or computer icon).
3. Click **Install**.

## Quick start

### Capture a thought

1. Open the app and tap **Capture**.
2. Type your idea in the **"What's on your mind?"** box.
3. Choose a type: Business idea, Hobby, DIY project, AI project, Learning, or Other.
4. Tap **Save quickly** (under 20 seconds).
5. Or tap **Add details** to fill in optional fields later.

### Get a suggestion for today

1. Tap **Today**.
2. Optionally pick your available time, energy, and mood.
3. Tap **Pick for me** or **Gentle choice** for a low-energy, short activity.
4. The app shows one card with a suggested activity and why it fits.
5. Tap **Start this**, **Done**, **Not today** (snoozes for 24 hours), or **Pick another**.

### Export business ideas to ChatGPT Work

1. Tap **Export**.
2. In the **Business Export** section, choose:
   - **Selected captures** (check the ones you want)
   - **All unprocessed captures**
   - **All captures**
3. Tap **Download Markdown** or **Download JSON**.
4. A file like `YYYY-MM-DD-business-idea-inbox-v1.md` is saved to your device.
5. Open ChatGPT Work and paste or upload the file. The export includes processing instructions for your Incubator.

### Import processing results back

1. After ChatGPT Work processes your captures, it may return a JSON result.
2. In the **Export** tab, paste that JSON into the **Processing Result Import** textarea.
3. Tap **Preview** to see what will change.
4. Tap **Apply** to update your local captures with official Idea IDs and outcomes.

### Back up your data

1. Tap **Export**.
2. In the **Backup & Restore** section, tap **Download full backup**.
3. Save the JSON file somewhere safe (cloud storage, email, etc.).
4. To restore, tap **Choose file** and select your backup JSON.
5. Preview the changes, then choose **Merge** or **Replace all**.

## Important privacy notes

- **Your data lives in this browser on this device.** It is stored in IndexedDB (a local browser database).
- **Clearing browser data or site storage will erase your ideas.** Regular backups are strongly recommended.
- **GitHub hosts the app code, not your ideas.** The repository contains only fake sample data, never your real captures.
- **No accounts, no servers, no analytics, no tracking.** Everything happens locally in your browser.

## Updating the app

When a new version is deployed, the app will show a calm update prompt. Tap **Update** to get the latest version. Your data is preserved during updates because it lives in the browser, not in the app files.

## Requirements

- A modern web browser (Chrome, Safari, Edge, Firefox)
- Works offline after the first online visit
- No account or login required

## Development and deployment

This project uses Node.js 22 and npm. To work on it locally:

```sh
npm ci
npm test
npm run build
npm run dev
```

The production site is built and deployed by [the GitHub Pages workflow](.github/workflows/deploy.yml) whenever a commit reaches `main`. In the repository's **Settings → Pages**, the publishing source must be set to **GitHub Actions**.

The GitHub Pages path is intentionally configured for the repository name `idea-incubator-companion`. If the repository is renamed or forked under a different name, update `base`, `scope`, `start_url`, and the icon paths in `vite.config.ts` before deploying.

## Known limitations (version 1)

- Data does not sync between devices automatically. Use backup/restore to move data.
- No photos, file attachments, or speech transcription.
- No calendar integration, recurring plans, or session timer.
- No direct ChatGPT or OpenAI API integration.

## Support

If you find a bug or have a suggestion, [open an issue](https://github.com/freddywinkel/idea-incubator-companion/issues).

## License

[MIT](LICENSE) — use it freely for your own personal productivity.
