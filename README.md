# Clean Subs for YouTube

Chrome extension that cleans up the YouTube Subscriptions page:

- Removes the "Most relevant" section and other injected shelves
- Removes the Shorts shelf and any Shorts mixed into the video grid
- Adds a sticky **Videos | Shorts** tab bar that switches the page in place
- Keeps "All subscriptions" on the same row as the tabs
- Matches YouTube's light or dark theme

![Illustration of the Videos and Shorts tabs on the Subscriptions page](store-assets/screenshot-1280x800.png)

*Illustration with placeholder content, not a capture of a real account.*

## Install

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and select this folder
4. Reload YouTube

## Adjusting

If YouTube adds another section you want gone, add its heading text
(lower-case) to the `blocked` list in `HEADINGS` at the top of `content.js`,
then click the reload icon on the extension card in `chrome://extensions`.

## Development

Requires Node.js. The extension itself has no dependencies; npm is only used
for tooling.

```sh
npm install
npm run lint      # ESLint
npm run package   # builds clean-subs-for-youtube-<version>.zip for the Web Store
```

## Known limitations

- Section headings and the "All subscriptions" control are matched by their
  English text, so the extension works best with YouTube set to English.
- The **Shorts** tab shows only the Shorts YouTube has loaded into the feed;
  the tab links to the full subscription Shorts page when none are loaded.
- This extension relies on YouTube's page structure, which can change without
  notice. If something stops working, please open an issue.

## License

[MIT](LICENSE) © 2026 Atsukio

## Disclaimer

This project is not affiliated with, endorsed by, or sponsored by YouTube or
Google LLC. YouTube is a trademark of Google LLC.
