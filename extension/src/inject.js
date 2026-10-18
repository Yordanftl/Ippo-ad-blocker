// Ippo AdBlocker — page-context (MAIN world) script.
// 1) YouTube: strips ad placements from player/JSON responses and neuters
//    the ad request pipeline. Domain blocking alone cannot stop YouTube ads
//    because they come from the same hosts as the videos.
// 2) Popups: blocks window.open() calls not triggered by a recent user gesture.
(function () {
  "use strict";
  if (window.__ippoInjected) return; // ran twice (manifest MAIN world + tag fallback)
  window.__ippoInjected = true;

  // ---------- YouTube ad stripping ----------
  const host = location.hostname;
  const isYT = /(^|\.)youtube\.com$/.test(host) || /(^|\.)youtube-nocookie\.com$/.test(host);

  if (isYT) {
    const AD_KEYS = new Set([
      "adPlacements", "adSlots", "playerAds", "adBreakHeartbeatParams",
      "adBreakService", "adSignals", "instreamAdPlayerOverlayRenderer",
      "adPings", "companions", "adLayoutLoggingData", "playerAdParams",
      "linearAdSequenceRenderer", "adThumbnails", "adVideoEndcapRenderer"
    ]);

    function clean(obj, depth) {
      if (!obj || typeof obj !== "object" || (depth || 0) > 30) return;
      if (Array.isArray(obj)) {
        for (const item of obj) clean(item, (depth || 0) + 1);
        return;
      }
      for (const k of Object.keys(obj)) {
        if (AD_KEYS.has(k)) {
          try { delete obj[k]; } catch (_) {}
          continue;
        }
        clean(obj[k], (depth || 0) + 1);
      }
    }

    // Hook JSON.parse — YouTube parses most config/player data through it.
    const origParse = JSON.parse;
    JSON.parse = function (text, reviver) {
      const result = origParse.call(JSON, text, reviver);
      try {
        if (typeof text === "string" &&
            (text.indexOf("adPlacements") !== -1 || text.indexOf("playerAds") !== -1)) {
          clean(result);
        }
      } catch (_) {}
      return result;
    };

    // Hook fetch — catches player API responses (youtubei/v1/player etc).
    if (window.fetch) {
      const origFetch = window.fetch;
      window.fetch = function (...args) {
        return origFetch.apply(this, args).then((res) => {
          try {
            const url = typeof args[0] === "string" ? args[0] : (args[0] && args[0].url) || "";
            if (url.indexOf("/youtubei/") !== -1 || url.indexOf("get_video_info") !== -1) {
              return res.clone().text().then((text) => {
                if (text.indexOf("adPlacements") === -1 && text.indexOf("playerAds") === -1) {
                  return res;
                }
                const obj = JSON.parse(text);
                clean(obj);
                return new Response(JSON.stringify(obj), {
                  status: res.status,
                  statusText: res.statusText,
                  headers: res.headers
                });
              }).catch(() => res);
            }
          } catch (_) {}
          return res;
        });
      };
    }

    // Hook XHR for completeness.
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      try {
        if (typeof url === "string" && url.indexOf("/youtubei/") !== -1) {
          this.addEventListener("readystatechange", function () {
            if (this.readyState === 4) {
              try {
                const text = this.responseText;
                if (typeof text === "string" &&
                    (text.indexOf("adPlacements") !== -1 || text.indexOf("playerAds") !== -1)) {
                  const obj = JSON.parse(text);
                  clean(obj);
                  const patched = JSON.stringify(obj);
                  Object.defineProperty(this, "responseText", { value: patched });
                  Object.defineProperty(this, "response", { value: patched });
                }
              } catch (_) {}
            }
          });
        }
      } catch (_) {}
      return origOpen.call(this, method, url, ...rest);
    };
  }

  // ---------- Popup blocking ----------
  // window.open is allowed only when BOTH:
  //  1. a real (trusted) user gesture happened within the last second, and
  //  2. that gesture landed on an interactive element (link/button/form control).
  // Condition 2 kills click-jacking popunders (pirate-streaming sites cover the
  // page with an invisible overlay, so the "user click" hits a plain <div>).
  let lastGesture = 0;
  let lastGestureInteractive = false;
  const GESTURE_MS = 1000;
  const INTERACTIVE = "a,button,input,select,textarea,label,summary,[role='button'],[role='link']";

  const onGesture = (e) => {
    if (!e.isTrusted) return;
    lastGesture = Date.now();
    const t = e.target;
    lastGestureInteractive = !!(t && t.closest && t.closest(INTERACTIVE));
  };
  for (const evt of ["click", "mousedown", "keydown", "touchstart"]) {
    window.addEventListener(evt, onGesture, { capture: true, passive: true });
  }

  const FAKE_WINDOW = {
    closed: true, opener: null, location: { href: "", assign() {}, replace() {} },
    close() {}, focus() {}, blur() {}, postMessage() {},
    document: { write() {}, writeln() {}, open() {}, close() {} }
  };

  const origWindowOpen = window.open;
  window.open = function (url, name, features) {
    const recent = (navigator.userActivation && navigator.userActivation.isActive) ||
                   (Date.now() - lastGesture < GESTURE_MS);
    if (!recent || !lastGestureInteractive) {
      console.debug("[Ippo AdBlocker] blocked popup:", url);
      return FAKE_WINDOW;
    }
    return origWindowOpen.call(window, url, name, features);
  };

  // Block programmatic target=_blank clicks with no gesture.
  window.addEventListener("click", (e) => {
    if (e.isTrusted) return;
    const a = e.target && e.target.closest ? e.target.closest("a[target=_blank],a[target=_new]") : null;
    if (a) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, { capture: true });
})();
