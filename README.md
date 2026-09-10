# Spoutube

A Manifest V3 Chrome extension that reskins **YouTube Music** (music.youtube.com)
to look like **Spotify's** desktop web player. Content-script only — no backend.

## Load it (unpacked)

1. Open `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked** and select this folder
4. Open <https://music.youtube.com> — the reskin applies automatically
5. Click the Spoutube toolbar icon to toggle it **On/Off** (reload the tab after toggling)

## Structure

| File | Purpose |
|------|---------|
| `manifest.json` | MV3 manifest; injects the content script + CSS on music.youtube.com |
| `src/spotify.css` | The reskin — all rules scoped under `html.spoutube-enabled` |
| `src/content.js` | Adds/removes the `spoutube-enabled` root class; handles the toggle |
| `popup/` | Toolbar popup with the on/off switch |
| `icons/` | Extension icons |

## Status

Working MVP: top bar, sidebar, content cards, and now-playing bar are reskinned.
Pixel-level fidelity is being refined iteratively against the real Spotify web player.
