// Site adapter contract:
//   name, matches(location), targetSelector, getVideo(target) -> { url, title } | null
// Register with window.W2GAdapters.push(adapter).
(window.W2GAdapters ||= []).push({
  name: 'youtube',
  matches: (loc) => /(^|\.)youtube\.com$/.test(loc.hostname),

  // Preview thumbnails only (old + new renderers), not the watch-page or Shorts players.
  targetSelector: 'ytd-thumbnail, yt-thumbnail-view-model',

  getVideo(target) {
    const link = target.querySelector('a[href*="/watch?v="], a[href*="/shorts/"], a[href*="youtu.be/"]')
      || target.closest('a[href*="/watch?v="], a[href*="/shorts/"]');
    if (!link) return null;

    const card = target.closest(
      'ytd-rich-item-renderer, ytd-video-renderer, ytd-compact-video-renderer, ytd-grid-video-renderer,' +
      'ytd-playlist-video-renderer, yt-lockup-view-model, ytm-shorts-lockup-view-model, ytd-reel-item-renderer'
    ) || target.parentElement;
    const title = link.getAttribute('title')
      || card?.querySelector('#video-title, h3, [title]')?.textContent
      || link.getAttribute('aria-label');
    return { url: new URL(link.getAttribute('href'), location.origin).href, title: clean(title) };
  },
});

const clean = (s) => (s || '').replace(/\s+/g, ' ').trim();
