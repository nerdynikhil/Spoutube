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

  // Spoutube wordmark = Spotify's green icon + "Spoutube" text (Circular font).
  const SPOTIFY_WORDMARK = `
    <span class="spoutube-wordmark__icon" aria-hidden="true">
      <svg width="30" height="30" viewBox="0 0 30 30" xmlns="http://www.w3.org/2000/svg">
        <path fill="#1ed760" d="M15 0C6.72 0 0 6.72 0 15s6.72 15 15 15 15-6.72 15-15S23.31 0 15 0zm6.88 21.64a.94.94 0 0 1-1.29.31c-3.52-2.15-7.95-2.64-13.17-1.45a.94.94 0 1 1-.42-1.83c5.71-1.3 10.6-.74 14.55 1.67.44.27.58.85.33 1.3zm1.84-4.09a1.17 1.17 0 0 1-1.61.39c-4.03-2.48-10.18-3.2-14.95-1.75a1.17 1.17 0 1 1-.68-2.24c5.45-1.65 12.22-.85 16.85 2a1.17 1.17 0 0 1 .39 1.6zm.16-4.26C19.24 10.42 11.2 10.16 6.53 11.58a1.41 1.41 0 1 1-.82-2.7C11.07 7.26 19.95 7.57 25.4 10.81a1.41 1.41 0 0 1-1.44 2.42z"/>
      </svg>
    </span>
    <span class="spoutube-wordmark__text">Spoutube</span>`;

  function replaceLogo() {
    const logo = document.querySelector("ytmusic-logo");
    if (!logo || logo.hasAttribute(SPOUTUBE_FLAG)) return;
    logo.setAttribute(SPOUTUBE_FLAG, "1");
    const mark = document.createElement("span");
    mark.className = "spoutube-wordmark";
    mark.innerHTML = SPOTIFY_WORDMARK;
    logo.appendChild(mark);
  }

  /* Rebuild the player bar's center column into Spotify's structure:
   *   [ transport buttons row ]
   *   [ curTime ── progress ── totalTime ]
   * We move the REAL YTM #progress-bar + transport buttons (so all controls
   * keep working) and mirror the live "cur / total" time text into two spans.
   * Idempotent: re-running is a cheap no-op once structured. */
  function restructurePlayerBar() {
    const bar = document.querySelector("ytmusic-player-bar");
    if (!bar) return;
    const left = bar.querySelector("#left-controls");
    const progress = bar.querySelector("#progress-bar");
    if (!left || !progress) return;

    // Already structured and progress still parented by us → nothing to do.
    if (left.getAttribute("data-spoutube-structured") === "1" && left.contains(progress)) return;

    const timeInfo = bar.querySelector(".time-info");

    // 1) Row wrapper for the transport buttons.
    let transportRow = left.querySelector(":scope > .spoutube-transport-row");
    if (!transportRow) {
      transportRow = document.createElement("div");
      transportRow.className = "spoutube-transport-row";
      // Move every current child (buttons etc.) into the row, except the raw
      // time-info (kept hidden as our sync source) and the progress slider.
      Array.from(left.children).forEach((ch) => {
        if (ch === progress) return;
        if (ch.classList && ch.classList.contains("time-info")) return;
        if (ch.classList && ch.classList.contains("spoutube-transport-row")) return;
        transportRow.appendChild(ch);
      });
      left.appendChild(transportRow);
    }

    // 1b) Spotify puts shuffle FIRST and repeat LAST in the center cluster.
    // YTM keeps them in #right-controls, so relocate the real buttons here
    // (they keep working) and tag them for green-active styling.
    const bar2 = bar;
    const shuffle = bar2.querySelector("#right-controls .shuffle, ytmusic-player-bar .shuffle");
    const repeat = bar2.querySelector("#right-controls .repeat, ytmusic-player-bar .repeat");
    if (shuffle && shuffle.parentElement !== transportRow) {
      shuffle.classList.add("spoutube-shuffle");
      transportRow.insertBefore(shuffle, transportRow.firstChild);
    }
    if (repeat && repeat.parentElement !== transportRow) {
      repeat.classList.add("spoutube-repeat");
      transportRow.appendChild(repeat);
    }

    // 2) Progress row: [cur] [real slider] [total].
    let progressRow = left.querySelector(":scope > .spoutube-progress-row");
    if (!progressRow) {
      progressRow = document.createElement("div");
      progressRow.className = "spoutube-progress-row";
      const cur = document.createElement("span");
      cur.className = "spoutube-time-cur";
      const total = document.createElement("span");
      total.className = "spoutube-time-total";
      progressRow.appendChild(cur);
      progressRow.appendChild(progress); // move the real paper-slider
      progressRow.appendChild(total);
      left.appendChild(progressRow);

      // Mirror YTM's "1:21 / 4:15" text into the two flanking spans.
      const syncTimes = () => {
        const parts = ((timeInfo && timeInfo.textContent) || "").split("/");
        if (parts.length === 2) {
          cur.textContent = parts[0].trim();
          total.textContent = parts[1].trim();
        }
      };
      syncTimes();
      if (timeInfo) {
        const to = new MutationObserver(syncTimes);
        to.observe(timeInfo, { childList: true, characterData: true, subtree: true });
      }
    } else if (!progressRow.contains(progress)) {
      // Slider got re-parented by YTM; pull it back between the time spans.
      progressRow.insertBefore(progress, progressRow.querySelector(".spoutube-time-total"));
    }

    left.setAttribute("data-spoutube-structured", "1");
  }

  const run = () => {
    markPlayerBar();
    replaceLogo();
    restructurePlayerBar();
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
