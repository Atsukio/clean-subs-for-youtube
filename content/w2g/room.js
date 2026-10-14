// Opens the chosen sidebar tab (Chat / Playlist / History) when a Watch2Gether room loads.
// Registered at runtime by the service worker, only while access to w2g.tv is granted and a tab is chosen.
(() => {
  'use strict';

  const INDEX = { chat: 0, playlist: 1, history: 2 }; // left to right in the room sidebar
  const GIVE_UP_MS = 20000;

  // Sidebar tabs: #w2g-sidebar-menu > three .w2g-menu-item (Chat, Playlists, History; only the first two have ids).
  // Not a generic ".w2g-menu with three items": the playlist's shuffle options have the same shape.
  const findTab = (which) => document.querySelectorAll('#w2g-sidebar-menu > .w2g-menu-item')[INDEX[which]] || null;

  // The site may listen for mousedown, pointer or click, so send the whole sequence
  function press(el) {
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    }
  }

  let done = false;
  async function run() {
    const { w2gRoomTab: which } = await EFY.load();
    if (!(which in INDEX)) return;

    const attempt = () => {
      if (done) return true;
      const tab = findTab(which);
      if (!tab) return false;
      done = true;
      if (!tab.classList.contains('w2g-active')) press(tab);
      return true;
    };
    if (attempt()) return;

    // The room renders after load; watch until the tabs exist, then stop (never fight the user's own tab choice)
    const observer = new MutationObserver(() => { if (attempt()) observer.disconnect(); });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), GIVE_UP_MS);
  }

  run();
})();
