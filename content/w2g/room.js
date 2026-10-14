// On a Watch2Gether room page: opens the chosen sidebar tab (Chat / Playlist / History), and tells the player frame
// (content/w2g/player.js) whether anyone else is online, for "don't autoplay when I'm alone".
// Registered at runtime by the service worker, only while access to w2g.tv is granted and one of those is on.
(() => {
  'use strict';

  const INDEX = { chat: 0, playlist: 1, history: 2 }; // left to right in the room sidebar
  const SETTLE_MS = 15000; // how long to keep the choice applied while the page finishes loading
  const MAX_PRESSES = 8;   // safety stop if the page keeps undoing it

  // Sidebar tabs: #w2g-sidebar-menu > three .w2g-menu-item (Chat, Playlists, History; only the first two have ids).
  // Not a generic ".w2g-menu with three items": the playlist's shuffle options have the same shape.
  const findTab = (which) => document.querySelectorAll('#w2g-sidebar-menu > .w2g-menu-item')[INDEX[which]] || null;

  // The site may listen for mousedown, pointer or click, so send the whole sequence
  function press(el) {
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    }
  }

  // The room keeps initialising after the tabs first appear and can reset the sidebar to Chat, so the choice is re-applied
  // while the page settles. It stops for good once the user clicks a tab themselves (a real click is trusted, ours is not).
  let userChose = false;
  document.addEventListener('pointerdown', (e) => {
    if (e.isTrusted && e.target instanceof Element && e.target.closest('#w2g-sidebar-menu')) userChose = true;
  }, true);

  function runTab(which) {
    const started = Date.now();
    let presses = 0;
    let timer = 0;
    const observer = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(apply, 100); });

    function apply() {
      if (userChose || presses >= MAX_PRESSES || Date.now() - started > SETTLE_MS) return observer.disconnect();
      const tab = findTab(which);
      if (tab && !tab.classList.contains('w2g-active')) { presses++; press(tab); }
    }

    // Class changes matter too: that is how a reset to Chat shows up
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    apply();
    setTimeout(() => observer.disconnect(), SETTLE_MS);
  }

  // "Members online" count in the header; it includes you. The player is an iframe from another site, so it is told by
  // message, both when it asks (it may load after the count) and whenever the count changes.
  const PLAYER_ORIGIN = 'https://player.w2g.tv';
  function onlineCount() {
    const n = parseInt(document.querySelector('[data-w2g*="onlineUsers"]')?.textContent, 10);
    return Number.isFinite(n) ? n : null;
  }
  function tell(target) {
    const n = onlineCount();
    if (n !== null && target) target.postMessage({ efyW2g: 'alone', alone: n <= 1 }, PLAYER_ORIGIN);
  }
  function runAlone() {
    window.addEventListener('message', (e) => {
      if (e.origin === PLAYER_ORIGIN && e.data?.efyW2g === 'ask') tell(e.source);
    });
    let last = null;
    const observer = new MutationObserver(() => {
      const n = onlineCount();
      if (n === last) return;
      last = n;
      for (const frame of document.querySelectorAll('iframe.w2g-npa-frame')) tell(frame.contentWindow);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
    setTimeout(() => observer.disconnect(), 30000); // the player only acts in its first 20s
  }

  EFY.load().then((s) => {
    if (s.w2gRoomTab in INDEX) runTab(s.w2gRoomTab);
    if (s.w2gNoAutoplayAlone) runAlone();
  });
})();
