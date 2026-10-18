# Changelog

All notable changes to Ippo AdBlocker.

## [2.0.1] — 2026-10-18

Safari compatibility + popup hardening release.

### Fixed

- **Safari dropped ~40k rules**: Safari compiles DNR rules into its internal
  content-blocker format with a hard 150,000-rule limit. The three rulesets
  are now globally deduplicated — 188,528 → **132,612 unique rules** with zero
  coverage loss (AdGuard Base was ~56k duplicates of EasyList/EasyPrivacy),
  fitting under Safari's cap on all platforms.
- **Click-jacking popunders allowed**: sites (pirate streaming etc.) cover the
  page with an invisible overlay, so the "user gesture" check passed.
  `window.open` now additionally requires that the gesture landed on an
  interactive element (`a`, `button`, form control, `[role=button]`).
  Verified via CDP: no-gesture popup → blocked, click on plain div → blocked,
  click on real button → allowed.
- **Injection race**: `inject.js` was loaded via a `<script>` tag that could
  finish *after* the page's own inline scripts, letting load-time popups and
  early YouTube ad data through. It is now a manifest-declared
  `world: "MAIN"` content script at `document_start`, guaranteed to run before
  any page script (the tag injection remains as a fallback for older Safari).

### Notes

- Safari reminder: content scripts (popup blocking, cosmetics) only run on
  sites you grant permission to — Safari → Settings → Extensions → Ippo
  AdBlocker → "Always Allow on Every Website" for full protection.

## [2.0.0] — 2026-10-17

A ground-up upgrade of the filtering engine. v1 blocked a single small hosts
list; v2 blocks what real ad blockers block.

### Added

- **188,528 network rules** compiled from EasyList (55,276), EasyPrivacy
  (56,305), and AdGuard Base (76,947) via `@adguard/dnr-converter`, replacing
  the 3,568-domain Peter Lowe hosts list.
- **YouTube video ad blocking**: page-context (MAIN world) script that strips
  `adPlacements` / `playerAds` / `adSlots` from YouTube player responses via
  `JSON.parse` / `fetch` / `XMLHttpRequest` hooks, plus auto-click on skip
  buttons and fast-forward of unskippable ads.
- **Popup blocking**: `window.open()` requires a trusted user gesture (or one
  within the last second); gesture-less popups get a dummy window object.
  Programmatic `target=_blank` clicks without a gesture are cancelled.
- **13,861 generic cosmetic rules** extracted from the three filter lists
  (`src/generic-cosmetic.css`), removing sponsored content and ad containers
  network rules can't reach.
- **Safari support**: Xcode project for macOS and iOS generated with
  `safari-web-extension-converter`, both targets build cleanly.
- **Build tooling**: `tools/update_filters.sh` rebuilds rulesets + cosmetic
  CSS from the latest upstream lists in one command.

### Changed

- Extension source moved into `extension/` so the Safari project can reference
  it with repo-relative paths.
- `redirect` DNR actions rewritten to `block` (no bundled redirect resources).
- Converter source-map metadata stripped from rules (Chrome rejects unknown
  rule keys).

### Fixed

- v1 appeared to "block nothing": the 3.5k-domain list missed most modern ad
  infrastructure, YouTube ads are architecturally unreachable by domain
  blocking, and no popup blocking existed. All three are addressed above.

### Verified

- Service worker boots, all 3 rulesets enabled (Chrome DevTools Protocol).
- `adsbygoogle.js` and `google-analytics.js` both blocked with
  `ERR_BLOCKED_BY_CLIENT` (A/B-tested against the same browser without the
  extension, where both returned HTTP 200).
- On youtube.com: injection confirmed, JSON.parse hook strips ad fields from a
  live test payload.
- Safari macOS + iOS targets: `BUILD SUCCEEDED`.

## [1.0.0] — 2026-10-16

Initial release.

- 3,568 network blocking rules generated from Peter Lowe's hosts-format list.
- Basic cosmetic filtering (~40 hand-written selectors) with a
  MutationObserver for late-injected nodes.
- Popup UI with per-tab / all-time blocked counters and an on/off toggle.
- Packed `.crx` for Chromium sideloading.
