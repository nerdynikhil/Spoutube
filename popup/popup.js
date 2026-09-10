const toggle = document.getElementById("toggle");
const statusText = document.getElementById("statusText");

const KEY = "spoutubeEnabled";

// Load current state (default: enabled)
chrome.storage.sync.get({ [KEY]: true }, (res) => {
  const enabled = res[KEY];
  toggle.checked = enabled;
  statusText.textContent = enabled ? "On" : "Off";
});

toggle.addEventListener("change", () => {
  const enabled = toggle.checked;
  statusText.textContent = enabled ? "On" : "Off";
  chrome.storage.sync.set({ [KEY]: enabled }, () => {
    // Live-update any open YouTube Music tabs
    chrome.tabs.query({ url: "https://music.youtube.com/*" }, (tabs) => {
      for (const tab of tabs) {
        chrome.tabs.sendMessage(tab.id, { type: "spoutube:toggle", enabled }).catch(() => {});
      }
    });
  });
});
