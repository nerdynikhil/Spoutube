/* Spoutube content script.
 * Strategy: the injected spotify.css is entirely scoped under `html.spoutube-enabled`.
 * We add/remove that class to toggle the reskin live. We also do light DOM
 * augmentation that CSS alone can't do (injecting labels/icons YTM lacks, and
 * marking the sidebar/player structure so flexbox reordering is reliable).
 */
(() => {
  const ROOT_CLASS = "spoutube-enabled";
  const KEY = "spoutubeEnabled";
  const root = document.documentElement;

  function apply(enabled) {
    root.classList.toggle(ROOT_CLASS, enabled);
  }

  // Set state ASAP (document_start) to avoid a flash of unstyled YouTube Music.
  try {
    chrome.storage.sync.get({ [KEY]: true }, (res) => apply(res[KEY] !== false));
  } catch (e) {
    apply(true);
  }

  // Live toggle from the popup.
  chrome.runtime?.onMessage?.addListener((msg) => {
    if (msg && msg.type === "spoutube:toggle") apply(!!msg.enabled);
  });

  /* ---- DOM augmentation ---------------------------------------------------
   * These run continuously because YouTube Music is a Polymer SPA that swaps
   * nodes in and out on navigation. We keep operations idempotent and cheap.
   */

  const SPOUTUBE_FLAG = "data-spoutube";

  function markPlayerBar() {
    const bar = document.querySelector("ytmusic-player-bar");
    if (bar && !bar.hasAttribute(SPOUTUBE_FLAG)) {
      bar.setAttribute(SPOUTUBE_FLAG, "1");
    }
  }

  // Inject a "Spotify-style" library header label into the sidebar if missing.
  function decorateGuide() {
    const guide = document.querySelector("ytmusic-guide-renderer #sections, tp-yt-app-drawer #guide-renderer");
    // no-op placeholder; sidebar styling is CSS-driven. Kept for future labels.
  }

  const run = () => {
    markPlayerBar();
    decorateGuide();
  };

  // Observe the SPA for structural changes; throttle with rAF.
  let scheduled = false;
  const schedule = () => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; run(); });
  };

  const startObserver = () => {
    run();
    const mo = new MutationObserver(schedule);
    mo.observe(document.documentElement, { childList: true, subtree: true });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startObserver, { once: true });
  } else {
    startObserver();
  }
})();
