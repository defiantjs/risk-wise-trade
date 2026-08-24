# PipGrade — Fix Trade-Card Share Button + Mobile/Home-Screen Support

## 1. Fix "Sharing isn't available here" on Share / Save Image

**What's happening:** the share overlay's primary button relies on the Web Share API with file support (`navigator.canShare({ files })`). That's only available on mobile Safari/Chrome. On desktop browsers and inside webviews it fails, and the fallback message ("press and hold the image") is a mobile-only instruction — a dead end on desktop.

**Fix in `src/routes/validate.tsx` (`ManualSaveOverlay`):**

- Detect capability once when the overlay opens (`canShare({ files })` + touch detection) and adapt the UI instead of failing after the tap:
  - **File share supported (most phones):** "Share / Save Image" is the primary button → opens the native share sheet (Save to Photos, Messages, etc.).
  - **Not supported (desktop, webviews):** primary button becomes "Download PNG" and actually downloads the card. No share button, no error text.
- If a share attempt still fails (user cancels → ignore; real error), fall back to automatically downloading the PNG instead of showing the dead-end message.
- Platform-correct hint text:
  - Touch devices: "Press and hold the image → Save to Photos."
  - Desktop: "Right-click the image → Save image as…" (plus the Download button).

## 2. Mobile: already works — make it installable

The app is not desktop-only: all four pages are responsive and were QA'd at 390px (nav, cards, overlay all fit). To make it feel like a real phone app, add **home-screen install support** (no offline mode, no service worker):

- `public/manifest.webmanifest` — name "PipGrade", `display: "standalone"`, theme/background colors matching the dark UI.
- App icons under `public/` (generate a PipGrade "Activity" mark icon: 512px + 180px apple-touch-icon).
- Head tags in `src/routes/__root.tsx`: manifest link, `theme-color`, `apple-touch-icon`, `mobile-web-app-capable`.

Result: on a phone, "Add to Home Screen" installs PipGrade as a full-screen app icon, like a native app.

## 3. Verify (Playwright)

- Desktop: Generate Trade Card → overlay → Share/Save button no longer errors; PNG downloads.
- Mobile viewport (390px): overlay layout, long-press hint, and buttons all fit and work.

## Technical details

- Only `src/routes/validate.tsx` (overlay logic), `src/routes/__root.tsx` (head tags), and new files under `public/` are touched.
- No service worker, no offline caching — manifest-only installability per platform guidance.
- No backend or login involved.
