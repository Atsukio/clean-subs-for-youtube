# AGENTS.md

Guidance for AI agents (and humans) working in this repo. **Keep this file up to date:
whenever a change alters structure, conventions, permissions, tooling, release steps or
a decision recorded here, update the relevant section in the same commit.**

## What this is

**Everything for YouTube**: a Manifest V3 Chrome extension, built mainly for personal and
friends' use (others are welcome to use it). It merges two former projects:

- *Clean Subs for YouTube*: Subscriptions page features (this repo's original code).
- *YouTube to W2G* (`Atsukio/yt-to-w2g`, now archived): a thumbnail button that adds a video
  to a Watch2Gether room.

Every feature is an independent toggle in the popup and applies live, without a page reload.
Plain JS/CSS/HTML, no framework, no bundler. npm is for dev tooling only.

The GitHub repo is still named `clean-subs-for-youtube`; `manifest.json` `homepage_url` and the
banner in the archived W2G repo point at it.

## Layout

```text
manifest.json            MV3 manifest (version, permissions, content scripts)
background/              service-worker.js (module): W2G requests, permission -> toggle sync
content/
  subs-cleaner.js/.css   Subscriptions page features (hide shelves, Videos|Shorts tabs)
  theme.css              GENERATED M3 tokens for the tab bar
  w2g/button.js          thumbnail "W" button; enable()/disable() live
  w2g/adapters/youtube.js   site adapter (selectors + getVideo)
popup/                   settings popup (popup.html/css/js)
  theme.css              GENERATED M3 tokens for the popup
  fonts/                 GENERATED copy of Roboto 400/500 woff2 + licence
lib/settings.js          feature toggles shared by content scripts and popup (globalThis.EFY)
lib/ids.js               YouTube URL -> canonical id (service worker only)
icons/                   16/48/128 extension icons (generated, see Icon)
store-assets/            Web Store icon, screenshot and its HTML source
scripts/                 package.js (zip), build-assets.mjs (theme + fonts)
PRIVACY.md               privacy policy; its GitHub URL is entered in the Web Store listing
dist/                    build output, git-ignored
```

## Commands

```sh
npm install
npm run lint       # ESLint over everything
npm run assets     # regenerate popup/theme.css, content/theme.css, popup/fonts/
npm run package    # dist/everything-for-youtube-<version>.zip (what gets uploaded)
```

Test by loading the repo folder unpacked at `chrome://extensions`. There are no automated tests.
After a code change, reload the extension card and refresh YouTube.

## Settings and permissions model

- Toggles live in `chrome.storage.sync` under key `settings` (`lib/settings.js`, defaults in
  `EFY.DEFAULTS`). Cleaner features default **on**, `w2g` defaults **off**.
- W2G **API key and streamkey live in `chrome.storage.local`** and must never go to sync.
- `storage` is the only install-time permission. The W2G hosts (`api.w2g.tv`, `w2g.tv`,
  YouTube `oembed`) are **`optional_host_permissions`**: the popup requests them when the W2G toggle
  is switched on and removes them when it is switched off. The service worker mirrors
  `permissions.onAdded/onRemoved` into the `w2g` toggle, because Chrome can close the popup during
  the permission prompt and permissions can be revoked from `chrome://extensions`.
- Popup grouping: a "YouTube" group (h2) holds a subsection per page (h3, currently "Subscriptions page");
  new on-YouTube features go in a subsection there, and a separate service gets its own group (h2)
  after a divider, like Watch2Gether.
- Adding a feature: add a default to `EFY.DEFAULTS`, a switch in `popup.html` with
  `data-setting`, and gate the behaviour in the content script (see `rysl-f-*` classes in
  `subs-cleaner.js`/`.css` and `setEnabled()` in `w2g/button.js`). It must undo itself cleanly when
  switched off.
- Anything new that sends data off the device needs a `PRIVACY.md` update and, if it needs host
  access, should be an optional permission.

## Design: Material Design 3

Our own UI follows Material Design 3 (colour roles, type scale, shape, state layers, 48dp targets)
with **Roboto**.

- Colours are real M3 roles generated from seed `#3d6fd8` (the icon's blue) by
  `scripts/build-assets.mjs` using `@material/material-color-utilities` **0.3.0** (0.4.0 ships
  broken ESM imports under Node 24; do not upgrade without checking). Change the seed or tokens in the
  script, run `npm run assets`, and commit the generated files. Never hand-edit `theme.css`.
- Use tokens (`var(--md-sys-color-*)`, `--md-sys-shape-*`, `--md-sys-typescale-*`,
  `--md-sys-state-*`), not raw values. Components in use: switch, outlined text field with floating
  label, filled / tonal / text buttons, divider between setting groups, segmented button (the Videos|Shorts tabs).
- Popup type sizes are deliberately one step down the M3 scale for a compact popup: title-medium (16px)
  heading, body-medium (14px) for list items and fields, body-small (12px) for supporting text.
  Do not go back to body-large/title-large without a reason. Switches are also compact (40x24, list rows
  48px) instead of the M3 default 52x32/56px.
- Fonts are bundled locally (`popup/fonts`, Roboto, OFL licence included): the popup must not make
  network requests. The injected tab bar relies on YouTube's own already-loaded Roboto.
- Popup follows `prefers-color-scheme`; the tab bar follows YouTube's `html[dark]`. The bar's
  background, text and divider deliberately follow YouTube's theme so it blends into the page;
  only the controls use M3 roles.
- The W2G thumbnail button deliberately mimics YouTube's own thumbnail overlay buttons rather than M3.

## YouTube DOM notes

- All selectors depend on YouTube's markup and can break without notice. Heading matching is by
  English text (`HEADINGS` at the top of `subs-cleaner.js`); this is a documented limitation.
- Cleaner CSS is gated by classes on `<html>`: `rysl-on`, `rysl-f-blocked`, `rysl-f-tabs`,
  `rysl-mode-videos|shorts`. The `rysl-` prefix is historical; keep it.
- The mutation observers are debounced and idle off the relevant pages. Keep it that way: YouTube
  mutates the DOM constantly.
- The `All subscriptions` control is *moved* into the tab bar, so removing the bar must put it back
  (`restoreAllSubscriptions()`).

## Web Store notes

- Name is "Everything for YouTube", **not** "YouTube Everything": Google's branding rules
  discourage a name that starts with "YouTube".
- Manifest `description` must stay <= 132 characters.
- Listing purpose to state: improve YouTube browsing (single-purpose policy; the two feature sets
  are justified as one purpose, so keep the description consistent).
- Privacy policy URL: `https://github.com/Atsukio/clean-subs-for-youtube/blob/main/PRIVACY.md`.
  Update `PRIVACY.md` (and its effective date) whenever data handling changes.
- Screenshots are 1280x800 24-bit PNG. `store-assets/screenshot.html` is the source; it uses the real
  `content/theme.css` and `content/subs-cleaner.css`. It is a clearly labelled illustration with
  placeholder content (README says so). Prefer a real capture if one can be taken without personal data.
- Release: bump `version` in `manifest.json` and `package.json`, `npm run lint`, `npm run package`,
  upload the zip from `dist/`.

## Icon

Pixel art, drawn on a 32x32 grid and scaled 4x with nearest-neighbour for 128px (so it stays crisp);
16 and 48 are downscaled from 128. Transparent rounded corners. The tile runs edge to edge. There
is no script for it yet: it was generated with a one-off PowerShell/System.Drawing script. If you
change it, regenerate all of `icons/icon{16,48,128}.png` and `store-assets/webstore-icon.png`.

## Conventions

- Match the surrounding style. Keep comments to what is non-obvious.
- Commits: imperative summary line, short body when useful, end with the Co-Authored-By trailer given
  by the session. Do not push or archive anything without the owner's explicit say-so.
- Git warns "LF will be replaced by CRLF" on Windows. It is harmless; do not "fix" line endings.

## Environment gotchas (Windows)

- Node must be on PATH. If a terminal started before install can't find `node`, add
  `C:\Program Files\nodejs` to PATH for that session or restart VS Code fully.
- In Git Bash, `tar` resolves to GNU tar. `scripts/package.js` calls Windows' own
  `System32\tar.exe` (bsdtar) explicitly so the zip has forward-slash paths; PowerShell 5.1
  `Compress-Archive` writes backslashes and should not be used.
- Windows PowerShell 5.1 `Get-Content`/`Set-Content` re-encode UTF-8 (it mangled the (c) sign in
  the README once). Edit text files with the editor tools or `sed`, not PowerShell read/write.
- In `sed`, do not use `#` as the delimiter when the replacement contains `#` (Markdown headings).

## Status and ideas not yet done

- Not tested end to end in Chrome by the assistant: load unpacked and check each toggle, the
  permission prompt, and the toolbar icon sizes.
- Possible later: popup screenshot for the listing, a script to regenerate the icon, Firefox support,
  non-English YouTube support.
