# Privacy Policy

Effective date: October 13, 2026

Everything for YouTube adds optional features to YouTube in your browser: a cleaner Subscriptions page, filters for videos and Shorts, and an "add to Watch2Gether" button on video thumbnails and on the video page. Each feature can be switched on or off in the extension's popup. This policy describes the information the extension handles.

## Subscriptions page features

When you visit YouTube, the extension checks the current page URL so it can activate only on the Subscriptions page. On that page it reads section headings and video or Shorts links to identify and organize the feed. This happens locally in your browser and is not sent anywhere.

It saves your selected Videos or Shorts tab in the browser's `sessionStorage` so the selection can be restored during that tab's session.

## Filters and hiding Shorts

The optional filters (watched videos, title keywords, channel names, minimum length) and "Hide Shorts everywhere" read what is shown on the YouTube page, such as titles, channel names, video length and watch progress, to decide what to hide or dim. This happens locally in your browser and none of it is sent or stored.

## Watch2Gether feature (off by default)

This feature is off until you turn it on. Turning it on makes Chrome ask for access to `w2g.tv`, `api.w2g.tv` and YouTube's `oembed` page; turning it off hands that access back.

When enabled, the extension handles:

- **Your Watch2Gether API key and rooms** (each room is a name and a streamkey), which you enter in the popup. They are stored in your browser's local extension storage (`chrome.storage.local`). They are not synced between devices and are not sent to the developer. You can remove them at any time with "Forget" in the popup.
- **The video URL, title and thumbnail address** of the video you click the button on, on a thumbnail or on the video page. When you click, these are sent to the Watch2Gether API at `api.w2g.tv` together with your API key, so the video is added to your room's playlist.
- **The video URL**, sent to YouTube's public `oembed` service only when a title cannot be read from the page.
- **A request to your room page** at `w2g.tv` when you use "Test connection".

Watch2Gether's own privacy policy applies to the information you send to it.

## Settings

Your on/off choices and options, including any keywords and channel names you type into the filters, are stored with `chrome.storage.sync`, so Chrome may sync them across your signed-in browsers. The Watch2Gether key and rooms are never part of this.

"Share settings" copies those same options to your clipboard only when you click Export, and reads a code only when you click Import. Nothing is uploaded anywhere.

## How information is used and shared

Apart from the Watch2Gether requests described above, which you trigger yourself, information is processed locally in your browser. The developer does not receive it. The extension does not sell it, share it with third parties, use analytics, or collect information for advertising.

## Changes to this policy

If the extension's data practices change, this policy will be updated to describe them.

## Contact

For questions about this policy, contact the publisher through the contact information on the Everything for YouTube Chrome Web Store listing.
