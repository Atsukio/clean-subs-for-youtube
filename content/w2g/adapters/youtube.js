// Site adapter contract:
//   name, matches(location), targetSelector, getVideo(target) -> { url, title } | null
//   optional: isWatchPage(location), watchTargetSelector, getWatchVideo() -> { url, title }
// Register with window.W2GAdapters.push(adapter).
(window.W2GAdapters ||= []).push({
  name: 'youtube',
  matches: (loc) => /(^|\.)youtube\.com$/.test(loc.hostname),

  // Preview thumbnails only (old + new renderers), not the watch-page or Shorts players.
  targetSelector: 'ytd-thumbnail, yt-thumbnail-view-model',

  // The video page: a pill button in the action row, next to Like / Dislike, adds the video being watched.
  isWatchPage: (loc) => loc.pathname === '/watch',
  watchTargetSelector: 'ytd-watch-metadata #top-level-buttons-computed',
  getWatchVideo() {
    const title = document.querySelector('ytd-watch-metadata h1')?.textContent || document.title.replace(/ - YouTube$/, '');
    return { url: location.href, title: clean(title) };
  },

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
