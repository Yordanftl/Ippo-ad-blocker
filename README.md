# Ippo AdBlocker

A Manifest V3 ad blocker for **Chrome, Brave, Opera, Safari (macOS), and Safari (iOS)**.

- **188,000+ network rules** compiled from EasyList, EasyPrivacy, and AdGuard Base — the same filter lists that power uBlock Origin and AdGuard
- **YouTube video ad blocking** — strips ad placements from YouTube's player data, auto-clicks skip buttons, fast-forwards unskippable ads
- **Popup blocking** — kills `window.open()` calls that don't follow a real user click
- **13,800+ cosmetic rules** — removes sponsored posts, banner containers, and ad leftovers the network layer can't reach
- **Popup UI** with per-tab and all-time blocked counters and an on/off toggle
- No accounts, no telemetry, no remote code. Everything runs locally.

## Install

### Chrome / Brave / Opera (one build works for all three)

1. Download `ippo-adblocker-v2.0.0-chromium.zip` from [Releases](../../releases) and unzip it.
2. Open the extensions page (`chrome://extensions`, `brave://extensions`, or `opera://extensions`).
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** and select the unzipped folder.

### Safari (macOS)

1. Open `safari/Ippo AdBlocker/Ippo AdBlocker.xcodeproj` in Xcode.
2. Select your Apple ID as the signing team for both targets (a free account works): project → target → *Signing & Capabilities*.
3. Run the **Ippo AdBlocker (macOS)** scheme once, then quit the container app.
4. Safari → **Settings → Extensions** → enable **Ippo AdBlocker**, and grant it permission on websites ("Always Allow on Every Website" for full coverage).

### Safari (iOS / iPadOS)

1. Same Xcode project — run the **Ippo AdBlocker (iOS)** scheme on your device or simulator.
2. On the device: **Settings → Safari → Extensions** → enable **Ippo AdBlocker** and allow it on websites.
3. Free Apple IDs provision for 7 days; a paid developer account signs for a year. (App Store distribution would require a paid account and review.)

## What's new in v2.0.0

See [CHANGELOG.md](CHANGELOG.md) for details. Short version: v1 blocked 3.5k domains
and nothing else; v2 brings the full EasyList/EasyPrivacy/AdGuard rulesets (188k rules),
YouTube ad stripping, popup blocking, and 13.8k cosmetic filters.

## Repository layout

```
extension/               Manifest V3 source (Chrome / Brave / Opera / Safari)
  manifest.json
  rules/                 declarativeNetRequest static rulesets (~188k rules)
    rules_1.json         EasyList
    rules_2.json         EasyPrivacy
    rules_3.json         AdGuard Base
  src/
    background.js        service worker: badge counter, on/off toggle, stats
    content.js           isolated world: injects page script, cosmetic cleanup, YT skip
    inject.js            MAIN world: YouTube ad stripping + popup guard
    generic-cosmetic.css 13.8k hiding rules extracted from the filter lists
    cosmetic.css         small base cosmetic rules
    popup.*              toolbar popup UI
  icons/
safari/                  Xcode project (macOS + iOS), references ../extension
tools/
  update_filters.sh      one-command filter refresh (download → convert → clean)
  clean_rulesets.py      dnr-converter output → loadable MV3 rulesets
  extract_cosmetics.py   filter lists → generic-cosmetic.css
  build_hosts_rules.py   v1 pipeline (hosts list → DNR), kept for reference
```

## Updating the filter lists

```sh
tools/update_filters.sh
```

This downloads the latest EasyList / EasyPrivacy / AdGuard Base, converts them
to DNR rulesets with [`@adguard/dnr-converter`](https://www.npmjs.com/package/@adguard/dnr-converter),
cleans the output (strips source-map metadata Chrome rejects, rewrites
redirects to blocks), and regenerates the cosmetic CSS.

## How it works

**Network blocking** — Chrome's `declarativeNetRequest` API evaluates ~188k
static rules natively in the browser process, so requests to ad/tracker
endpoints are cancelled before they leave the machine. No per-request JS
overhead.

**YouTube ads** — YouTube serves ads from the same hosts as videos, so domain
blocking can't touch them. `inject.js` runs in the page's main world and hooks
`JSON.parse`, `fetch`, and `XMLHttpRequest` to delete `adPlacements`,
`playerAds`, `adSlots` and friends from YouTube's player responses. A
content-script observer clicks skip buttons and fast-forwards unskippable ads
as a fallback.

**Popup blocking** — `window.open` is allowed only during (or within 1s of) a
trusted user gesture; everything else returns a dummy window object.

**Cosmetic filtering** — generic `##selector` rules from the filter lists are
compiled to a plain CSS file injected at `document_start`, plus a
MutationObserver that removes matching nodes added later.

## Known limitations

- YouTube actively fights ad blockers; the injection approach works as of this
  release but may need updates as YouTube changes its player.
- MV3's static ruleset cap is 300,000 rules; we currently use ~188k.
- Browser extensions cannot block ads in **other apps** — that requires
  DNS-level or hosts-file blocking.

## License

MIT — see [LICENSE](LICENSE).

Filter lists are the work of the EasyList and AdGuard communities.
