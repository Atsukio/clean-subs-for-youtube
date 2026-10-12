// YouTube cleanup features that are not the tab bar:
//   - hide Shorts everywhere (pure CSS, switched by a class on <html>)
//   - Subscriptions page filters: watched videos, title/channel text, minimum length
// Each feature is a toggle in the popup (lib/settings.js) and undoes itself when switched off.
(() => {
  const SUBS_PATH = "/feed/subscriptions";
  const WATCHED_PCT = 90; // a video counts as watched from this progress

  let settings = { ...EFY.DEFAULTS };
  EFY.load().then((s) => { settings = s; schedule(); });
  EFY.onChange((s) => { settings = s; schedule(); });

  const onSubs = () => (location.pathname.replace(/\/+$/, "") || "/") === SUBS_PATH;
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim().toLowerCase();

  // Video cards on the Subscriptions page (grid, list and older grid layouts)
  const CARD = "ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer";

  const text = (card, selector) => norm(card.querySelector(selector)?.textContent);

  function watchedPercent(card) {
    const bar = card.querySelector(
      "ytd-thumbnail-overlay-resume-playback-renderer #progress, [class*='WatchedProgressBarSegment']"
    );
    const pct = parseFloat(bar?.style.width);
    return Number.isFinite(pct) ? pct : 0;
  }

  // Length in minutes from the time badge ("12:34", "1:02:03"); null for live streams, premieres etc.
  function lengthMinutes(card) {
    const badge = text(card, "ytd-thumbnail-overlay-time-status-renderer #text, .yt-badge-shape__text");
    const m = badge.match(/^(?:(\d+):)?(\d{1,2}):(\d{2})$/);
    return m ? Number(m[1] || 0) * 60 + Number(m[2]) + Number(m[3]) / 60 : null;
  }

  // Why a card should be filtered, or null
  function verdict(card, words, channels) {
    if (settings.hideWatched && watchedPercent(card) >= WATCHED_PCT) return "watched";
    if (settings.hideByText) {
      const title = text(card, "#video-title, #video-title-link, .yt-lockup-metadata-view-model__title, h3");
      if (title && words.some((w) => title.includes(w))) return "keyword";
      const names = [...card.querySelectorAll("ytd-channel-name, #channel-name, .yt-content-metadata-view-model__metadata-text")]
        .map((el) => norm(el.textContent));
      if (names.some((n) => channels.includes(n))) return "channel";
    }
    if (settings.hideShort) {
      const minutes = lengthMinutes(card);
      if (minutes !== null && minutes < settings.minMinutes) return "short";
    }
    return null;
  }

  let tagged = false;

  function clearTags() {
    if (!tagged) return;
    tagged = false;
    document.querySelectorAll("[data-efy-hide], [data-efy-dim]").forEach((el) => {
      el.removeAttribute("data-efy-hide");
      el.removeAttribute("data-efy-dim");
    });
  }

  function filterSubscriptions() {
    const anyOn = settings.hideWatched || settings.hideByText || settings.hideShort;
    if (!onSubs() || !anyOn) return clearTags();
    const words = (settings.blockedWords || []).map(norm).filter(Boolean);
    const channels = (settings.blockedChannels || []).map(norm).filter(Boolean);
    tagged = true;
    document.querySelectorAll(CARD).forEach((card) => {
      const why = verdict(card, words, channels);
      const dim = why === "watched" && settings.watchedMode === "dim";
      if (why && !dim) card.setAttribute("data-efy-hide", why); else card.removeAttribute("data-efy-hide");
      if (dim) card.setAttribute("data-efy-dim", ""); else card.removeAttribute("data-efy-dim");
    });
  }

  function apply() {
    document.documentElement.classList.toggle("efy-no-shorts", !!settings.hideShortsEverywhere);
    filterSubscriptions();
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => { scheduled = false; apply(); });
  }

  // New cards arrive while scrolling; debounce, and stay idle when there is nothing to filter
  let timer = 0;
  new MutationObserver(() => {
    if (!onSubs() && !tagged) return;
    clearTimeout(timer);
    timer = setTimeout(schedule, 150);
  }).observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener("yt-navigate-finish", schedule);
  window.addEventListener("popstate", schedule);
  schedule();
})();
