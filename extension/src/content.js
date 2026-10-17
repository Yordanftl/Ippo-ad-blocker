// Ippo AdBlocker content script (isolated world).
// - Injects src/inject.js into the page's MAIN world (YouTube ad stripping,
//   popup blocking) — required because page-context hooks can't run from an
//   isolated world.
// - YouTube UI cleanup: auto-clicks skip buttons and fast-forwards ads.
// - Cosmetic filtering: removes ad nodes added after initial load.

// ---- MAIN world injection ----
(function injectMainWorld() {
  try {
    const s = document.createElement("script");
    s.src = chrome.runtime.getURL("src/inject.js");
    s.async = false;
    (document.head || document.documentElement).prepend(s);
    s.onload = () => s.remove();
  } catch (_) {}
})();

// ---- YouTube ad UI handling ----
const isYT = /(^|\.)youtube(-nocookie)?\.com$/.test(location.hostname);
if (isYT) {
  const trySkip = () => {
    // Click any visible skip button
    for (const sel of [".ytp-skip-ad-button", ".ytp-ad-skip-button", ".ytp-ad-skip-button-modern"]) {
      const btn = document.querySelector(sel);
      if (btn) { try { btn.click(); } catch (_) {} }
    }
    // Fast-forward + mute the ad that is currently playing
    const player = document.querySelector(".html5-video-player");
    if (player && (player.classList.contains("ad-showing") || player.classList.contains("ad-interrupting"))) {
      const video = player.querySelector("video");
      if (video && isFinite(video.duration)) {
        video.muted = true;
        video.playbackRate = 16;
        try { video.currentTime = video.duration; } catch (_) {}
      }
    }
    // Dismiss overlay ads
    const overlay = document.querySelector(".ytp-ad-overlay-close-button");
    if (overlay) { try { overlay.click(); } catch (_) {} }
  };
  new MutationObserver(trySkip).observe(document.documentElement, { childList: true, subtree: true });
  setInterval(trySkip, 1000);
}

// ---- Cosmetic removal of late-injected ad nodes ----
const SELECTORS = [
  "[id^='google_ads_iframe']", "[id^='div-gpt-ad']", "[data-ad-slot]",
  "[data-google-query-id]", "ins.adsbygoogle",
  "iframe[src*='doubleclick.net']", "iframe[src*='googlesyndication.com']",
  "iframe[src*='amazon-adsystem.com']",
  ".OUTBRAIN", "[data-widget-outbrain]", "[id^='taboola-']",
  // YouTube leftovers
  "ytd-display-ad-renderer", "ytd-promoted-sparkles-web-renderer",
  "ytd-ad-slot-renderer", "ytd-in-feed-ad-layout-renderer",
  "ytd-banner-promo-renderer", "#player-ads", ".ytp-ad-module",
  "ytd-engagement-panel-section-list-renderer[target-id*='ads']"
];

function removeAds(root) {
  for (const sel of SELECTORS) {
    try {
      root.querySelectorAll(sel).forEach((el) => el.remove());
    } catch (_) {}
  }
}

new MutationObserver((mutations) => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        removeAds(node.parentElement || document);
      }
    }
  }
}).observe(document.documentElement, { childList: true, subtree: true });

removeAds(document);
