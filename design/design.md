# Design: Idea Jar — Incubator Companion

## Product concept
A calm, mobile-first, installable PWA for someone who has many business ideas, hobbies, DIY ideas, and AI-project ideas but sometimes experiences decision paralysis. Two distinct purposes: (1) quickly collect unprocessed business ideas and export them to ChatGPT Work, and (2) maintain an Activity Jar and choose one thing to do based on time, energy, and mood.

## Target user
Creative person with many interests, some decision paralysis, wants a supportive offline tool that feels calm and trustworthy.

## Page / route map
HashRouter for GitHub Pages compatibility. Four main tabs with mobile bottom navigation:

1. **Today** (`#/today`) — Activity Jar picker. One result card. Time/energy/mood filters.
2. **Capture** (`#/capture`) — Fast capture form. "What's on your mind?" textarea, type selector, then expand optional fields.
3. **Library** (`#/library`) — Two tabs: Business Inbox and My Activities. Search + filters.
4. **Export & Backup** (`#/export`) — Export Markdown/JSON, import processing results, full backup/restore.

## Color palette
Warm, restrained, calm. No blue-purple gradients or highly saturated backgrounds.

- `--color-bg: #FAF7F2` — warm off-white page background
- `--color-surface: #FFFFFF` — cards and panels
- `--color-surface-raised: #F5F0E8` — slightly raised surfaces, secondary backgrounds
- `--color-text: #2A2520` — primary text, warm near-black
- `--color-text-secondary: #6B6560` — secondary/muted text
- `--color-text-tertiary: #9A9490` — placeholders, disabled
- `--color-accent: #C17A47` — warm amber/terracotta accent
- `--color-accent-soft: #E8D5C4` — accent tint for backgrounds, borders
- `--color-success: #6B8E5A` — soft green for "done", success
- `--color-warning: #D4A843` — soft gold for warnings, snoozed
- `--color-danger: #B85C5C` — muted red for destructive actions
- `--color-border: #E8E2DA` — dividers, borders
- `--color-focus: #C17A47` — focus ring matches accent

## Typography
- System font stack: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- Large headings: 1.75rem (28px), weight 700, letter-spacing -0.02em
- Section headings: 1.25rem (20px), weight 600
- Body: 1rem (16px), weight 400, line-height 1.6
- Small/labels: 0.875rem (14px), weight 500
- Micro: 0.75rem (12px), weight 500

## Layout rules
- Mobile-first: max-width 430px layout centered on larger screens with comfortable margins
- Desktop: centered card layout, max-width 720px, generous whitespace
- Bottom nav: fixed at bottom, 64px height, safe-area-inset padding
- Content area: `padding-bottom: calc(64px + env(safe-area-inset-bottom))`
- Cards: 16px border-radius, 1px border `--color-border`, subtle shadow `0 1px 3px rgba(0,0,0,0.04)`
- Buttons: min-height 48px, 12px border-radius, 16px horizontal padding
- Inputs: 48px min-height, 12px border-radius, 1px border, focus ring 2px offset
- Touch targets: minimum 44x44px

## Shared components
- `BottomNav` — four tabs with icon + label, active state accent color
- `Card` — white surface with rounded corners, border, optional padding
- `Button` — primary (accent), secondary (outline), ghost (text only), danger variants
- `IconButton` — 44x44 minimum, aria-label required
- `TextField` — textarea and input with label, help text, character count
- `SelectField` — styled select dropdown
- `Chip` — rounded pill tags, selectable
- `EmptyState` — centered illustration area + helpful text + next action button
- `Modal` — overlay with dismissible card, focus trap
- `Toast` — brief non-intrusive confirmation messages, 4 seconds
- `ActivityCard` — result card from picker with actions
- `FilterBar` — horizontal scrollable chips for filter options

## Interaction language
- Transitions: 150ms ease for colors, 200ms ease for transforms
- Active states: scale 0.98 on press, 100ms
- Focus: 2px solid accent ring, 2px offset
- Reduced motion: respect `prefers-reduced-motion`, disable transforms and transitions
- No excessive animation. No guilt language. No streaks or overdue warnings.
- Empty states explain what to do next in one sentence.
- Calm error messages. Never blame the user.

## Dependencies
- react, react-dom, react-router-dom (HashRouter)
- idb (IndexedDB wrapper)
- lucide-react (icons)
- vite-plugin-pwa (PWA manifest, service worker, icons)
- No heavy UI framework. Plain CSS with CSS variables.

## Asset manifest
- `public/icons/icon-192x192.png` — PWA icon 192px
- `public/icons/icon-512x512.png` — PWA icon 512px
- `public/icons/icon-maskable-192x192.png` — maskable icon
- `public/icons/icon-maskable-512x512.png` — maskable icon
- Icons generated as simple warm-toned SVGs with a jar/mason jar silhouette.

## Responsive
- Phone: full-width cards, bottom nav, stacked forms
- Tablet: 2-column layouts where appropriate (Library filters + list)
- Desktop: centered layout, max-width 720px, side padding

## Accessibility
- WCAG 2.2 AA target
- All interactive elements have visible focus states
- All icon buttons have aria-label
- Form labels explicitly associated
- Screen-reader-only text for context
- Color contrast ratios ≥ 4.5:1 for text
- Reduced-motion support via media query
- Keyboard navigation through all screens
