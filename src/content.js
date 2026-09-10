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

  // Spotify wordmark (green icon + "Spotify" text) injected over YTM's logo.
  const SPOTIFY_WORDMARK = `
    <svg width="98" height="30" viewBox="0 0 98 30" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="Spotify">
      <path fill="#1ed760" d="M15 0C6.72 0 0 6.72 0 15s6.72 15 15 15 15-6.72 15-15S23.31 0 15 0zm6.88 21.64a.94.94 0 0 1-1.29.31c-3.52-2.15-7.95-2.64-13.17-1.45a.94.94 0 1 1-.42-1.83c5.71-1.3 10.6-.74 14.55 1.67.44.27.58.85.33 1.3zm1.84-4.09a1.17 1.17 0 0 1-1.61.39c-4.03-2.48-10.18-3.2-14.95-1.75a1.17 1.17 0 1 1-.68-2.24c5.45-1.65 12.22-.85 16.85 2a1.17 1.17 0 0 1 .39 1.6zm.16-4.26C19.24 10.42 11.2 10.16 6.53 11.58a1.41 1.41 0 1 1-.82-2.7C11.07 7.26 19.95 7.57 25.4 10.81a1.41 1.41 0 0 1-1.44 2.42z"/>
      <path fill="#fff" d="M42.6 13.87c-2.6-.62-3.06-1.05-3.06-1.96 0-.86.81-1.44 2.01-1.44 1.17 0 2.32.44 3.53 1.35.04.03.08.04.13.03s.09-.03.11-.07l1.26-1.77a.17.17 0 0 0-.03-.23c-1.44-1.16-3.06-1.72-4.97-1.72-2.79 0-4.74 1.68-4.74 4.08 0 2.57 1.69 3.48 4.6 4.19 2.49.57 2.9 1.05 2.9 1.9 0 .95-.85 1.54-2.21 1.54-1.51 0-2.75-.51-4.13-1.7a.16.16 0 0 0-.12-.04.17.17 0 0 0-.11.05l-1.42 1.68c-.06.07-.05.17.01.23 1.6 1.43 3.57 2.18 5.7 2.18 3 0 4.95-1.64 4.95-4.19 0-2.16-1.29-3.35-4.44-4.1zm11.06-2.06c-1.3 0-2.37.51-3.25 1.56v-1.18a.17.17 0 0 0-.17-.17h-2.31a.17.17 0 0 0-.17.17v13.28c0 .09.08.17.17.17h2.31a.17.17 0 0 0 .17-.17v-4.19c.88.99 1.95 1.47 3.25 1.47 2.42 0 4.87-1.86 4.87-5.42s-2.45-5.29-4.87-5.29zm2.18 5.34c0 1.81-1.12 3.08-2.72 3.08-1.58 0-2.77-1.32-2.77-3.08s1.19-3.08 2.77-3.08c1.57 0 2.72 1.29 2.72 3.08zm9.11-5.34c-3.12 0-5.56 2.4-5.56 5.47 0 3.03 2.43 5.41 5.53 5.41 3.13 0 5.58-2.4 5.58-5.44 0-3.05-2.44-5.44-5.55-5.44zm0 8.44c-1.66 0-2.9-1.33-2.9-3.09 0-1.78 1.2-3.06 2.87-3.06 1.66 0 2.92 1.33 2.92 3.1 0 1.77-1.21 3.05-2.89 3.05zm12.09-8.23h-2.54v-2.6a.17.17 0 0 0-.17-.17h-2.31a.17.17 0 0 0-.17.17v2.6h-1.11a.17.17 0 0 0-.17.17v1.98c0 .1.08.17.17.17h1.11v5.14c0 2.08 1.03 3.13 3.07 3.13.83 0 1.52-.17 2.17-.54a.17.17 0 0 0 .09-.15v-1.89a.17.17 0 0 0-.24-.15c-.45.22-.88.33-1.36.33-.75 0-1.08-.34-1.08-1.1v-4.87h2.54a.17.17 0 0 0 .17-.17v-1.98a.16.16 0 0 0-.16-.17zm8.85.01v-.32c0-.94.36-1.36 1.17-1.36.48 0 .87.1 1.3.24a.17.17 0 0 0 .22-.16V8.99a.17.17 0 0 0-.12-.16 6.3 6.3 0 0 0-1.92-.27c-2.13 0-3.26 1.2-3.26 3.47v.49h-1.11a.17.17 0 0 0-.17.17v1.99c0 .09.08.17.17.17h1.11v7.93c0 .1.08.17.17.17h2.31a.17.17 0 0 0 .17-.17v-7.93h2.15l3.3 7.93c-.37.83-.74.99-1.24.99-.41 0-.83-.12-1.27-.36a.18.18 0 0 0-.13-.01.17.17 0 0 0-.1.09l-.78 1.72a.17.17 0 0 0 .07.22c.81.44 1.55.63 2.46.63 1.71 0 2.65-.8 3.48-2.94l4-10.34a.17.17 0 0 0-.16-.23h-2.4a.17.17 0 0 0-.16.11l-2.46 7.02-2.69-7.03a.17.17 0 0 0-.16-.11h-3.94zm-4.51-.01h-2.31a.17.17 0 0 0-.17.17v10.08c0 .1.08.17.17.17h2.31a.17.17 0 0 0 .17-.17V12.09a.17.17 0 0 0-.17-.17zm-1.14-4.59a1.65 1.65 0 1 0 0 3.3 1.65 1.65 0 0 0 0-3.3z"/>
    </svg>`;

  function replaceLogo() {
    const logo = document.querySelector("ytmusic-logo");
    if (!logo || logo.hasAttribute(SPOUTUBE_FLAG)) return;
    logo.setAttribute(SPOUTUBE_FLAG, "1");
    const mark = document.createElement("span");
    mark.className = "spoutube-wordmark";
    mark.innerHTML = SPOTIFY_WORDMARK;
    logo.appendChild(mark);
  }

  const run = () => {
    markPlayerBar();
    replaceLogo();
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
