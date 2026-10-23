// Ippo AdBlocker background service worker
// Tracks per-tab blocked counts (badge) and the global on/off toggle.

const RULESET_ID = "ruleset_1";

// Initialise state on install
chrome.runtime.onInstalled.addListener(async () => {
  const { enabled } = await chrome.storage.local.get("enabled");
  if (enabled === undefined) {
    await chrome.storage.local.set({ enabled: true, totalBlocked: 0 });
  }
});

// Keep the ruleset in sync with the stored toggle
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area === "local" && changes.enabled) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: changes.enabled.newValue ? [RULESET_ID] : [],
      disableRulesetIds: changes.enabled.newValue ? [] : [RULESET_ID]
    });
  }
});

// Count blocked requests per tab and show a badge
chrome.declarativeNetRequest.onRuleMatchedDebug?.addListener(() => {}); // no-op safeguard

async function bumpCount(tabId) {
  if (tabId < 0) return;
  const key = `blocked_${tabId}`;
  const data = await chrome.storage.local.get([key, "totalBlocked"]);
  const tabCount = (data[key] || 0) + 1;
  const total = (data.totalBlocked || 0) + 1;
  await chrome.storage.local.set({ [key]: tabCount, totalBlocked: total });
  chrome.action.setBadgeText({ tabId, text: String(tabCount) });
  chrome.action.setBadgeBackgroundColor({ tabId, color: "#d6336c" });
}

// onRuleMatched (available on MV3 with the right permission in Chromium 117+;
// fall back silently if not present)
if (chrome.declarativeNetRequest.onRuleMatched) {
  chrome.declarativeNetRequest.onRuleMatched.addListener((info) => {
    bumpCount(info.tabId);
  });
}

// Clean up stored counts when tabs close
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(`blocked_${tabId}`);
});

// Messages from the popup
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "getState") {
    chrome.storage.local.get(["enabled", "totalBlocked", `blocked_${msg.tabId}`]).then((d) => {
      sendResponse({
        enabled: d.enabled !== false,
        totalBlocked: d.totalBlocked || 0,
        tabBlocked: d[`blocked_${msg.tabId}`] || 0
      });
    });
    return true; // async response
  }
  if (msg.type === "setEnabled") {
    chrome.storage.local.set({ enabled: msg.enabled }).then(() => sendResponse({ ok: true }));
    return true;
  }
});
