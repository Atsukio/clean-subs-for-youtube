// Runs inside the room's player frame (player.w2g.tv, a separate site from the room page). When the room page says
// nobody else is online, it pauses the video that starts playing on joining, using W2G's own play/pause control.
// Registered at runtime by the service worker, only while access to player.w2g.tv is granted and the option is on.
(() => {
  'use strict';

  const ROOM_ORIGIN = 'https://w2g.tv';
  const WINDOW_MS = 30000;  // only the start of the visit counts as "on joining" (a reloaded player starts a new window)
  const POLL_MS = 500;
  const COOLDOWN_MS = 1500; // give W2G time to act on a press before trying again
  const MAX_PRESSES = 8;    // safety stop if something keeps restarting playback
  const log = (...args) => console.info('[Everything for YouTube]', ...args);

  // #player_controls > div[togglePlay] > i: .icon-play while paused, .icon-pause while playing
  const toggle = () => document.querySelector('#player_controls [data-w2g*="togglePlay"]');
  const isPlaying = (btn) => !!btn.querySelector('i.icon-pause');

  let alone = null;
  let userActed = false;
  let presses = 0;
  let lastPress = 0;
  const started = Date.now();

  // Any real input in the player means the user is choosing for themselves (our own clicks are not trusted)
  for (const type of ['pointerdown', 'keydown']) {
    document.addEventListener(type, (e) => {
      if (e.isTrusted && !userActed) { userActed = true; log('you used the player, so it is left alone from now on'); }
    }, true);
  }

  function press(el) {
    for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click']) {
      el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
    }
  }

  // Polled rather than driven by DOM changes: a press W2G ignores while the player is still starting changes nothing,
  // and the video must still be paused once W2G is ready.
  let poll = 0;
  function check() {
    if (userActed || presses >= MAX_PRESSES || Date.now() - started > WINDOW_MS) return clearInterval(poll);
    if (!alone || Date.now() - lastPress < COOLDOWN_MS) return;
    const btn = toggle();
    if (btn && isPlaying(btn)) {
      presses++;
      lastPress = Date.now();
      log(`nobody else is online, pausing (${presses})`);
      press(btn);
    }
  }

  window.addEventListener('message', (e) => {
    if (e.origin !== ROOM_ORIGIN || e.data?.efyW2g !== 'alone') return;
    if (alone !== !!e.data.alone) log(e.data.alone ? 'you are alone in the room' : 'someone else is online, autoplay is left alone');
    alone = !!e.data.alone;
    check();
  });

  (async () => {
    if (!(await EFY.load()).w2gNoAutoplayAlone) return;
    log('watching for autoplay on joining');
    poll = setInterval(check, POLL_MS);
    window.parent.postMessage({ efyW2g: 'ask' }, ROOM_ORIGIN); // the room page answers with "alone"
  })();
})();
