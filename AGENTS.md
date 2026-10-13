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
Features: Subscriptions page cleanup (hide shelves, Videos|Shorts tabs, watched / keyword / channel /
length filters), hide the Ask (Gemini) button, hide Shorts everywhere, Watch2Gether button (thumbnails and video page) with a room
switcher, a master pause switch, and settings export/import.
Plain JS/CSS/HTML, no framework, no bundler. npm is for dev tooling only.

The GitHub repo is `Atsukio/everything-for-youtube` (renamed from `clean-subs-for-youtube`; GitHub redirects the old
URL). `manifest.json` `homepage_url`, the listing values and the banner in the archived W2G repo point at it. The local
folder on the owner's machine is still called `clean-subs-for-youtube`; that does not matter.

## Layout

```text
manifest.json            MV3 manifest (version, permissions, content scripts)
background/              service-worker.js (module): W2G requests, permission -> toggle sync
content/
  subs-cleaner.js/.css   Subscriptions page layout features (hide shelves, Videos|Shorts tabs)
  yt-cleanup.js/.css     hide Shorts everywhere + Subscriptions filters (watched, keyword/channel, length)
  theme.css              GENERATED M3 tokens for the tab bar
  w2g/button.js          thumbnail "W" button; enable()/disable() live
  w2g/adapters/youtube.js   site adapter (selectors + getVideo)
popup/                   settings popup (popup.html/css/js)
  theme.css              GENERATED M3 tokens for the popup
  fonts/                 GENERATED copy of Roboto 400/500 woff2 + licence
lib/settings.js          feature toggles shared by content scripts and popup (globalThis.EFY)
lib/ids.js               YouTube URL -> canonical id (service worker only)
icons/                   16/48/128 extension icons (generated, see Icon)
store-assets/            Web Store icon, screenshots, promo tiles (+ their HTML sources), LISTING.md (dashboard values)
scripts/                 package.js (zip), build-assets.mjs (theme + fonts)
PRIVACY.md               privacy policy; its GitHub URL is entered in the Web Store listing
dist/                    build output, git-ignored
```

## Commands

```sh
npm install
npm run lint       # ESLint over everything
npm run assets     # regenerate popup/theme.css, content/theme.css, popup/fonts/
npm run screenshots  # re-render store-assets/screenshots/*.png and promo/*.png (needs Edge or Chrome)
npm run package    # dist/everything-for-youtube-<version>.zip (what gets uploaded)
```

Test by loading the repo folder unpacked at `chrome://extensions`. There are no automated tests.
After a code change, reload the extension card and refresh YouTube.

## Settings and permissions model

- Toggles and options live in `chrome.storage.sync` under key `settings` (`lib/settings.js`, defaults in
  `EFY.DEFAULTS`). The original cleaner features (shelves, tabs) default **on**; everything added later
  (filters, hide Shorts everywhere, `w2g`) defaults **off** so updates never change existing behaviour.
- `EFY.load()` returns the *effective* settings (every feature off while `paused`); `EFY.loadRaw()` returns what
  is stored and is what the popup edits. Content scripts must use `load()`/`onChange()`.
- `EFY.sanitize()` validates anything imported (known keys, types, clamped numbers, capped lists). Settings
  export/import deliberately excludes `w2g` (it depends on a per-browser permission) and never touches the
  key or rooms. sync items are limited to 8KB, so keyword/channel lists are capped at 100 entries.
- W2G rooms are `rooms: [{ name, streamkey }]` plus the active `streamkey`, all in `chrome.storage.local`. The popup keeps the
  add-room form behind an "Add another room" button (it opens by itself only when there is no room yet). The service worker
  stores the last failed add as `lastError: { message, at }` (cleared on the next success) and the popup shows it, because the
  button's own message is only visible for a few seconds (errors 8s). The add path was tested in Node with a stubbed `chrome`
  and mocked `fetch` (success, 403, network failure, no key, Shorts URL, non-video URL); never call the real W2G API with real keys.
  The service worker only reads `apiKey` and `streamkey`, so room switching just changes `streamkey`.
- W2G **API key and rooms live in `chrome.storage.local`** and must never go to sync or into exported settings.
- `chrome.permissions.remove()` throws "You cannot remove required permissions" for any origin already covered by a required
  permission, and content-script `matches` count: `https://www.youtube.com/oembed*` falls under `https://www.youtube.com/*`, so
  the popup only removes the two w2g.tv hosts (and swallows a failed removal so the toggle can still turn off).
- `storage` is the only install-time permission. The W2G hosts (`api.w2g.tv`, `w2g.tv`,
  YouTube `oembed`) are **`optional_host_permissions`**: the popup requests them when the W2G toggle
  is switched on and removes them when it is switched off. The service worker mirrors
  `permissions.onAdded/onRemoved` into the `w2g` toggle, because Chrome can close the popup during
  the permission prompt and permissions can be revoked from `chrome://extensions`.
- Menu icons: `scripts/pixel-icons.mjs` (run by `npm run assets`) draws 16x16 pixel-art SVGs into `popup/pixel/` (youtube, w2g,
  share, pause) on the same navy tile as the extension icon; the popup shows them at 32x32. Edit the script, not the SVGs.
- The popup groups (YouTube, Watch2Gether, Share settings) are collapsible `<details class="group" data-group="...">` with an M3
  expandable header; all groups start collapsed, and the open/closed state is remembered in `localStorage` (`efy-open`). A new
  group needs a `data-group` key. The screenshot stub in `scripts/screenshots.mjs` sets which groups are open per scene.
- Popup grouping: a "YouTube" group (h2) holds a subsection per page (h3: "Subscriptions page", "Video page", "All YouTube pages");
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
  48px, buttons 32px high) instead of the M3 default 52x32/56px/40px.
- Fonts are bundled locally (`popup/fonts`, Roboto, OFL licence included): the popup must not make
  network requests. The injected tab bar relies on YouTube's own already-loaded Roboto.
- Popup colour roles: group titles (h2) use `primary` (blue), subsection labels (h3: "Subscriptions page", "Video page", ...) use
  `tertiary` (orchid) so the two levels read differently.
- Popup follows `prefers-color-scheme`; the tab bar follows YouTube's `html[dark]`. The bar's
  background, text and divider deliberately follow YouTube's theme so it blends into the page;
  only the controls use M3 roles.
- The W2G thumbnail button deliberately mimics YouTube's own thumbnail overlay buttons rather than M3.

## YouTube DOM notes

- All selectors depend on YouTube's markup and can break without notice. Heading matching is by
  English text (`HEADINGS` at the top of `subs-cleaner.js`); this is a documented limitation.
- Cleaner CSS is gated by classes on `<html>`: `rysl-on`, `rysl-f-blocked`, `rysl-f-tabs`,
  `rysl-mode-videos|shorts`. The `rysl-` prefix is historical; keep it.
- Subscriptions filters tag cards with `data-efy-hide` / `data-efy-dim` (cleared when switched off). A video counts as
  watched at 90% progress (`WATCHED_PCT`); lengths come from the time badge, so live streams and premieres are
  never filtered by length. Title/keyword matching is substring, channel matching is an exact (case-insensitive) name.
- "Hide the Ask button" is CSS-only (`html.efy-no-ask`): it hides `yt-button-view-model` wrappers that contain
  `.you-chat-entrypoint-button` (a language-independent marker class on the Ask button's `button-view-model`), with an
  `aria-label="Ask"` fallback, scoped to `ytd-watch-metadata`.
- "Hide Shorts everywhere" is CSS-only and steps aside on the Subscriptions page while the tabs are on
  (`html.efy-no-shorts:not(.rysl-f-tabs)`), otherwise the Shorts tab would have nothing to show.
- **Video-page W button** (`createNativePill()` in `content/w2g/button.js`, toggle `w2gWatchPage`). Real structure of the
  action row (verified from pasted markup): inside `ytd-menu-renderer` there are TWO containers.
  `#top-level-buttons-computed` holds the Like/Dislike group (`segmented-like-dislike-button-view-model`, plus other
  extensions' bits such as Return YouTube Dislike's rate bar), while Share, Ask, Save... live in the separate
  `#flexible-item-buttons` as `yt-button-view-model.ytd-menu-renderer > button-view-model > button`.
  **Placement: right after the like group, in `#top-level-buttons-computed`** (adapter `getWatchTarget()`). Do NOT put
  it in `#flexible-item-buttons`: YouTube manages that container (it decides which buttons fit and moves the rest into the
  "..." menu, and rebuilds it on resize), and a foreign button there pushed Save into the menu and was removed on
  re-render (reported on the real page).
  The style source is a real button anywhere in the menu (`scope = bar.closest('ytd-menu-renderer')`), skipping the like group,
  icon-only buttons and our own, so the Share button is found even though it is in the other container. Searching only
  the like container finds nothing and silently produced the shadow fallback: do not do that.
  The row can still overflow on a narrow window because our button takes width; that is YouTube's own responsive logic.
- It is built from a real sibling button (Share...): class names copied at runtime, and the same **wrapper chain**
  (`yt-button-view-model` > `button-view-model`, element names and classes), so YouTube's own CSS (size M = 40px high, 20px
  radius, tonal/mono colours, light/dark) and the row's spacing rule (keyed on `yt-button-view-model.ytd-menu-renderer`) apply
  to it natively. A plain `<div>` with copied classes did NOT get the spacing. Classes are camelCase now
  (`ytSpecButtonShapeNext...`); older markup used `yt-spec-button-shape-next`, so matching is case-insensitive (`SHAPE_CLASS`).
  Inside the button: icon div, text div, a hover/press layer (`ytSpecTouchFeedbackShapeHost/Stroke/Fill`, rebuilt from plain
  divs; we drive the fill opacity: hover .1, press .2, since YouTube's custom elements are not attached to our button)
  and the rim light (`contribYtLightShape...`), all with classes copied from the sibling.
- `matchSpacing()` is a safety net that measures real pixel gaps and adjusts our margins only if they differ from the gap
  between YouTube's own buttons (normally it changes nothing). The logo is the coloured "+W" (yellow stroke, theme-coloured
  stroke, "+" only while idle), 28x19 in a 24px layout slot, with `fill="none"` on every path because YouTube's icon
  wrappers set `fill: currentColor`.
- If no sibling button exists yet, a shadow-DOM fallback pill (40px, `--yt-sys-color-baseline--*` colours, `data-theme`
  detection) is used and swapped for the native one on a later scan. `--yt-spec-*` variables do not exist on the real page.
  `scan()` re-places the pill if YouTube re-renders the row, and `yt-navigate-finish` resets it to idle so "Added" does not
  carry over. Thumbnails keep the hover-overlay variant. To test without YouTube, serve a mock row with this structure from a
  throwaway local server and serve the adapter with `matches` forced true (Edge forces HTTPS for youtube.com hosts).
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
- Privacy policy URL: `https://github.com/Atsukio/everything-for-youtube/blob/main/PRIVACY.md`.
  Update `PRIVACY.md` (and its effective date) whenever data handling changes.
- Screenshots are 1280x800 24-bit PNGs in `store-assets/screenshots/` (subscriptions, watch2gether thumbnails,
  watch2gether video page, settings, settings-watch2gether). `npm run screenshots` renders them from `store-assets/screenshot.html` (scenes by URL hash) using
  the real CSS and a popup preview generated from `popup/popup.html` (git-ignored). Re-run it after any UI
  change. They are clearly labelled illustrations with placeholder content; prefer real captures if they can be
  taken without personal data.
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

- **Web Store:** version 1.2.0 (the merged "Everything for YouTube", with the filters, Hide Shorts everywhere, W2G rooms,
  video-page button, Hide Ask and pause/share settings) has been uploaded by the owner. The store rejects a package whose
  version is not higher than the last upload, so **the next change that ships must bump the version** in `manifest.json` and
  `package.json` first (1.2.1 or higher), then `npm run package`.

- Not tested end to end in Chrome by the assistant: load unpacked and check each toggle, the
  permission prompt, the W button on the video page, and the toolbar icon sizes. The filter logic was
  checked against a mock Subscriptions page (a throwaway local server serving `/feed/subscriptions` with the real
  `yt-cleanup.js` and dumping the DOM in headless Edge); real YouTube markup may differ.
- Deliberately not built: "already added" memory for W2G (the API cannot read the playlist, so duplicates are not
  detected).
- Possible later: a script to regenerate the icon, Firefox support, non-English YouTube support.
