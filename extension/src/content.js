// Ippo AdBlocker cosmetic filter
// Removes ad containers that load from first-party domains the network rules
// can't touch (e.g. sponsored posts, self-hosted banners). Runs at
// document_start and observes DOM mutations.

const SELECTORS = [
  // Generic ad containers
  "[id^='google_ads_iframe']", "[id^='div-gpt-ad']", "[data-ad-slot]",
  "[data-ad-client]", "[data-ad-format]", "[data-google-query-id]",
  "ins.adsbygoogle", ".adsbygoogle",
  "iframe[src*='doubleclick.net']", "iframe[src*='googlesyndication.com']",
  "iframe[src*='amazon-adsystem.com']", "iframe[src*='ads.yahoo.com']",
  // Common class/id patterns
  ".ad-banner", ".ad-container", ".ad-wrapper", ".ad-slot", ".ad-unit",
  ".ad-leaderboard", ".ad-rectangle", ".ad-skyscraper", ".ad-sidebar",
  "#ad-banner", "#ad-container", "#ad-wrapper", "#ad-sidebar", "#ad-header",
  "[class*='sponsored-content']", "[class*='sponsored-post']",
  "[data-testid='ad-wrapper']", "[aria-label*='advertisement' i]",
  // Video/overlay ads
  ".ytp-ad-module", ".ytp-ad-overlay-container", ".video-ads",
  ".ad-showing .html5-video-container",
  // Outbrain/Taboola-style widgets
  ".OUTBRAIN", ".outbrain", "[data-widget-outbrain]",
  ".taboola", ".trc_rbox_container", "[id^='taboola-']",
  // Social sponsored
  "[data-testid='placementTracking']"
];

const CSS = SELECTORS.join(",") + "{display:none!important;visibility:hidden!important;height:0!important;min-height:0!important;}";

// Inject a style element as early as possible
function injectStyle() {
  if (document.getElementById("ippo-adblock-style")) return;
  const style = document.createElement("style");
  style.id = "ippo-adblock-style";
  style.textContent = CSS;
  (document.head || document.documentElement).appendChild(style);
}
injectStyle();

// Also remove matching nodes directly (catches cases where display:none is overridden)
function removeAds(root) {
  for (const sel of SELECTORS) {
    try {
      root.querySelectorAll(sel).forEach((el) => el.remove());
    } catch (_) { /* invalid selector on weird pages — ignore */ }
  }
}

const observer = new MutationObserver((mutations) => {
  for (const m of mutations) {
    for (const node of m.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) removeAds(node.parentElement || document);
    }
  }
});

if (document.documentElement) {
  observer.observe(document.documentElement, { childList: true, subtree: true });
}
