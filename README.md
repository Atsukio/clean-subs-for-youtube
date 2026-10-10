# Clean Subs for YouTube

Chrome extension that cleans up the YouTube Subscriptions page:

- Removes the "Most relevant" section and other injected shelves
- Removes the Shorts shelf and any Shorts mixed into the video grid
- Adds a sticky **Videos | Shorts** tab bar that switches the page in place
- Keeps "All subscriptions" on the same row as the tabs
- Matches YouTube's light or dark theme

## Install

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and select this folder
4. Reload YouTube

## Adjusting

If YouTube adds another section you want gone, add its heading text
(lower-case) to `BLOCKED_HEADINGS` in `content.js`, then click the reload
icon on the extension card in `chrome://extensions`.

## License

[MIT](LICENSE) © 2026 Atsukio

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by YouTube or
Google LLC. YouTube is a trademark of Google LLC.
