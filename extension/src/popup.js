const toggle = document.getElementById("toggle");
const stateLabel = document.getElementById("stateLabel");
const tabCount = document.getElementById("tabCount");
const totalCount = document.getElementById("totalCount");

async function refresh() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  chrome.runtime.sendMessage({ type: "getState", tabId: tab?.id ?? -1 }, (state) => {
    if (!state) return;
    toggle.classList.toggle("on", state.enabled);
    stateLabel.textContent = state.enabled ? "Protection on" : "Protection off";
    tabCount.textContent = state.tabBlocked;
    totalCount.textContent = state.totalBlocked;
  });
}

toggle.addEventListener("click", async () => {
  const nowOn = !toggle.classList.contains("on");
  toggle.classList.toggle("on", nowOn);
  stateLabel.textContent = nowOn ? "Protection on" : "Protection off";
  await chrome.runtime.sendMessage({ type: "setEnabled", enabled: nowOn });
});

refresh();
