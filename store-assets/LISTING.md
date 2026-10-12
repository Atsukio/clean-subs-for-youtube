# Chrome Web Store listing: Everything for YouTube

Values to enter in the Chrome Web Store developer dashboard. Keep in sync with `manifest.json`,
`PRIVACY.md` and the README whenever features, permissions or data handling change.

## Package

- Upload: `dist/everything-for-youtube-<version>.zip` (`npm run package`)
- Version: must be higher than the published one (currently 1.2.0; earlier releases 1.0.0 and 1.1.0)

## Store listing

- **Name:** Everything for YouTube (from the manifest)
- **Summary** (max 132 characters, taken from the manifest `description`):
  YouTube tweaks for personal and friends' use: Subscriptions tabs and filters, hide Shorts, one-click add to Watch2Gether.
- **Category:** Productivity
- **Language:** English
- **Icon (128x128):** `store-assets/webstore-icon.png`
- **Screenshots (1280x800, upload in this order):**
  1. `store-assets/screenshots/01-subscriptions.png`: Videos | Shorts tabs on the Subscriptions page
  2. `store-assets/screenshots/02-watch2gether.png`: the W button on thumbnails (idle and added)
  3. `store-assets/screenshots/03-settings.png`: the settings popup (YouTube options)
  4. `store-assets/screenshots/04-settings-watch2gether.png`: the Watch2Gether settings

  They are illustrations with placeholder content (regenerate with `npm run screenshots`); replace with
  real captures if they can be taken without personal data.
- **Homepage / support URL:** https://github.com/Atsukio/clean-subs-for-youtube
  (issues: https://github.com/Atsukio/clean-subs-for-youtube/issues)

### Detailed description

```text
Everything for YouTube is a small set of optional YouTube tweaks, built mainly for personal and friends' use. Every feature can be switched on or off from the extension's popup, and changes apply straight away without reloading the page.

SUBSCRIPTIONS PAGE
• Hide the "Most relevant" section and other extra shelves
• Videos | Shorts tabs that switch the page in place. The Videos tab hides Shorts mixed into the grid
• Keeps "All subscriptions" on the same row as the tabs
• Optional filters (off by default): dim or hide watched videos, hide videos by title keyword or channel name, hide videos shorter than a length you choose

ALL YOUTUBE PAGES
• Hide Shorts everywhere: Home, search, related videos and the sidebar (off by default)

WATCH2GETHER (off by default)
• Hover a video thumbnail, or the player on a video page, and click the W button to add that video to your Watch2Gether room's playlist
• Save several rooms and switch between them from the popup

SETTINGS
• Pause all features with one switch
• Export your settings as a short code and import a friend's
• Needs your own Watch2Gether API key and room. Chrome asks for access to w2g.tv only when you turn this on, and it is handed back when you turn it off

PRIVACY
• Nothing is sent to the developer, and there is no analytics
• The Subscriptions page features run entirely in your browser
• The Watch2Gether feature sends the video link, title and thumbnail, plus your API key, to Watch2Gether only when you click the button
• Your API key stays in local extension storage and is never synced

GOOD TO KNOW
• Works best with YouTube set to English
• It relies on YouTube's page structure, which can change without notice
• Not affiliated with, endorsed by, or sponsored by YouTube, Google or Watch2Gether
```

## Privacy tab

- **Single purpose:** Improve YouTube browsing by tidying the Subscriptions page and letting the
  user add videos to their own Watch2Gether room. Every feature is optional.
- **Privacy policy URL:** https://github.com/Atsukio/clean-subs-for-youtube/blob/main/PRIVACY.md

### Permission justifications

- **storage:** Saves the user's feature toggles (chrome.storage.sync) and, for the optional
  Watch2Gether feature, the user's own API key and room (chrome.storage.local, never synced).
- **Host access to www.youtube.com (content scripts):** Needed to tidy the Subscriptions page and
  to add the Watch2Gether button to video thumbnails on YouTube.
- **Optional host access to api.w2g.tv and w2g.tv:** Requested only when the user turns on the
  Watch2Gether feature. Used to add the chosen video to the user's room and to test the connection.
- **Optional host access to www.youtube.com/oembed:** Same optional request. Used only to look up a
  video's title when the page does not provide one.
- **Remote code:** No. All code is in the package.

### Data usage disclosures

- **Authentication information:** Yes. The user's Watch2Gether API key, stored locally and sent only
  to Watch2Gether when the user clicks the button.
- **Website content:** Yes. The URL, title and thumbnail address of the video the user chooses to
  add, sent to Watch2Gether. (The filters read page content such as titles and channel names, but only
  locally, and nothing is stored or sent.)
- All other categories: No.
- Certify: data is not sold to third parties, not used for purposes unrelated to the single purpose,
  and not used to determine creditworthiness or for lending.
