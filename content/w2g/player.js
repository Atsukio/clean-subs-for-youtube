// Runs inside the room's player frame (player.w2g.tv, a separate site from the room page). When the room page says
// nobody else is online, it pauses the video that starts playing on joining, using W2G's own play/pause control.
// Registered at runtime by the service worker, only while access to player.w2g.tv is granted and the option is on.
(() => {
  'use strict';

  const ROOM_ORIGIN = 'https://w2g.tv';
  const SETTLE_MS = 20000; // only the start of the visit counts as "on joining"
  const MAX_PRESSES = 5;   // safety stop if something keeps restarting playback

  // #player_controls > div[togglePlay] > i: .icon-play while paused, .icon-pause while playing
  const toggle = () => document.querySelector('#player_controls [data-w2g*="togglePlay"]');
  const isPlaying = (btn) => !!btn.querySelector('i.icon-pause');

  let enabled = false;
  let alone = false;
  let userActed = false;
  let presses = 0;
  const started = Date.now();

  // Any real input in the player means the user is choosing for themselves (our own clicks are not trusted)
  for (const type of ['pointerdown', 'keydown']) {
    document.addEventListener(type, (e) => { if (e.isTrusted) userActed = true; }, true);
  }

  function press(el) {
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    }
  }

  let timer = 0;
  const observer = new MutationObserver(() => { clearTimeout(timer); timer = setTimeout(check, 100); });

  function check() {
    if (userActed || presses >= MAX_PRESSES || Date.now() - started > SETTLE_MS) return observer.disconnect();
    if (!enabled || !alone) return;
    const btn = toggle();
    if (btn && isPlaying(btn)) { presses++; press(btn); }
  }

  window.addEventListener('message', (e) => {
    if (e.origin !== ROOM_ORIGIN || e.data?.efyW2g !== 'alone') return;
    alone = !!e.data.alone;
    check();
  });

  (async () => {
    enabled = !!(await EFY.load()).w2gNoAutoplayAlone;
    if (!enabled) return;
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
    setTimeout(() => observer.disconnect(), SETTLE_MS);
    window.parent.postMessage({ efyW2g: 'ask' }, ROOM_ORIGIN); // the room page answers with "alone"
    check();
  })();
})();
