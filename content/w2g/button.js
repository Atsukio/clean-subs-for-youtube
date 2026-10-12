(() => {
  const adapter = (window.W2GAdapters || []).find((a) => a.matches(location));
  if (!adapter) return;

  const MARK = 'data-w2g-injected';
  const RESULT_MS = 3000; // how long the result message stays before resetting
  // Two-tone "W" mark with a "+" while idle. `ink` is the colour of the "+" and the second stroke of the W.
  const icon = (ink) => `<svg viewBox="0 0 36 24" width="30" height="20" fill="none" stroke-width="3.4"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path class="plus" d="M6 7.5v9M1.5 12h9" stroke="${ink}" stroke-width="2.6"/>
    <g transform="translate(12 0)"><path d="M3 5l4.5 14L12 9" stroke="#FDBD00"/><path d="M12 9l4.5 10L21 5" stroke="${ink === '#fff' ? '#E8EDF4' : ink}"/></g></svg>`;

  // Thumbnails: a small overlay button that appears on hover, like YouTube's own (Watch later etc.)
  const STYLE_THUMB = `
    :host { all: initial; position: absolute; top: 8px; left: 8px; z-index: 2147483647; display: none; }
    button { all: initial; box-sizing: border-box; display: inline-flex; align-items: center; gap: 6px;
      height: 28px; padding: 0 6px; font: 500 12px/1 Roboto, Arial, sans-serif; color: #fff;
      background: rgba(0,0,0,.6); border-radius: 4px; cursor: pointer; }
    button:hover { background: rgba(0,0,0,.8); }
    span { display: none; padding-right: 4px; }
    button:not([data-state="idle"]) .plus { display: none; }
    button[data-state="loading"] { opacity: .7; cursor: wait; }
    button[data-state="added"] { outline: 2px solid #2e9d4f; outline-offset: -2px; }
    button[data-state="error"] { outline: 2px solid #c0392b; outline-offset: -2px; }
    button[data-state="loading"] span, button[data-state="added"] span, button[data-state="error"] span { display: inline; }
  `;
  // Video page: a pill in the action row next to Like / Dislike. It takes its colours from YouTube's own
  // theme variables (inherited into the shadow root), so it follows light and dark mode by itself.
  const STYLE_PILL = `
    :host { all: initial; display: inline-flex; align-items: center; margin-left: 8px; }
    button { all: initial; box-sizing: border-box; display: inline-flex; align-items: center; gap: 6px;
      height: 36px; padding: 0 16px 0 10px; font: 500 14px/20px Roboto, Arial, sans-serif; white-space: nowrap;
      color: var(--yt-spec-text-primary, #0f0f0f); background: var(--yt-spec-badge-chip-background, rgba(0,0,0,.05));
      border-radius: 18px; cursor: pointer; }
    button:hover { background: var(--yt-spec-mono-tonal-hover, rgba(0,0,0,.1)); }
    button:not([data-state="idle"]) .plus { display: none; }
    button[data-state="loading"] { opacity: .7; cursor: wait; }
    button[data-state="added"] { box-shadow: inset 0 0 0 2px #2e9d4f; }
    button[data-state="error"] { box-shadow: inset 0 0 0 2px #c0392b; }
  `;
  const LABELS_THUMB = { idle: '', loading: '…', added: 'Added', error: 'Error' };
  const LABELS_PILL = { idle: 'W2G', loading: '…', added: 'Added', error: 'Error' };

  // variant: 'thumb' (hover overlay on a thumbnail) or 'pill' (video page action row)
  function createButton(target, readVideo, variant) {
    const pill = variant === 'pill';
    const labels = pill ? LABELS_PILL : LABELS_THUMB;
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `<style>${pill ? STYLE_PILL : STYLE_THUMB}</style>` +
      `<button type="button">${icon(pill ? 'currentColor' : '#fff')}<span></span></button>`;
    const btn = root.querySelector('button');
    const label = root.querySelector('span');
    let timer;

    const setState = (state, title = '') => {
      btn.dataset.state = state;
      label.textContent = labels[state];
      btn.title = title || (state === 'idle' ? 'Add to W2G' : '');
    };
    setState('idle');

    // Swallow everything so the site never sees the click and opens the video.
    for (const type of ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup']) {
      btn.addEventListener(type, (e) => { e.stopPropagation(); e.preventDefault(); });
    }
    btn.addEventListener('click', async () => {
      if (btn.dataset.state === 'loading') return;
      const video = readVideo(); // read at click time: YouTube recycles elements
      if (!video) return flash('error', 'Could not find the video link.');
      setState('loading');
      host.keepVisible = true;
      try {
        const res = await chrome.runtime.sendMessage({ type: 'add', ...video });
        if (res.status === 'error') console.warn('[Clean Subs]', res.message);
        flash(res.status, res.message || '');
      } catch {
        flash('error', 'Extension was reloaded. Refresh the page.');
      }
    });

    // Keep the button on screen while the result shows, even if the mouse leaves.
    function flash(state, title) {
      setState(state, title);
      host.keepVisible = true;
      if (!pill) host.style.display = 'block';
      clearTimeout(timer);
      timer = setTimeout(() => {
        setState('idle');
        host.keepVisible = false;
        if (!pill && !target.matches(':hover')) host.style.display = 'none';
      }, RESULT_MS);
    }

    // Back to idle, e.g. when YouTube moves on to another video without reloading the page
    const reset = () => { clearTimeout(timer); setState('idle'); host.keepVisible = false; };

    if (!pill) root.host.style.display = 'none';
    return { host, reset };
  }

  // target -> what was added for it, so switching the feature off can undo everything.
  const injected = new Map();

  // The pill sits right after the Like/Dislike group, or first in the row if that can't be found
  function placePill(bar, host) {
    const likes = bar.querySelector('segmented-like-dislike-button-view-model, ytd-segmented-like-dislike-button-renderer');
    if (likes) likes.after(host); else bar.prepend(host);
  }

  function inject(target, kind = 'thumb') {
    if (injected.has(target)) return;
    target.setAttribute(MARK, '');
    if (kind === 'watch') {
      const { host, reset } = createButton(target, () => adapter.getWatchVideo(), 'pill');
      placePill(target, host);
      injected.set(target, { host, reset, kind });
      return;
    }
    const madeRelative = getComputedStyle(target).position === 'static';
    if (madeRelative) target.style.position = 'relative';
    const { host, reset } = createButton(target, () => adapter.getVideo(target), 'thumb');
    target.appendChild(host);
    const enter = () => { host.style.display = 'block'; };
    const leave = () => { if (!host.keepVisible) host.style.display = 'none'; };
    target.addEventListener('mouseenter', enter);
    target.addEventListener('mouseleave', leave);
    injected.set(target, { host, reset, enter, leave, madeRelative, kind });
  }

  function remove(target) {
    const { host, enter, leave, madeRelative } = injected.get(target);
    host.remove();
    if (enter) {
      target.removeEventListener('mouseenter', enter);
      target.removeEventListener('mouseleave', leave);
    }
    target.removeAttribute(MARK);
    if (madeRelative) target.style.position = '';
    injected.delete(target);
  }

  const removeAll = () => [...injected.keys()].forEach(remove);
  const removeKind = (kind) => [...injected].forEach(([target, info]) => { if (info.kind === kind) remove(target); });

  let settings = { w2g: false, w2gWatchPage: true };

  const scan = () => {
    // YouTube recycles and detaches thumbnails; forget the ones that are gone.
    for (const target of injected.keys()) if (!target.isConnected) injected.delete(target);
    document.querySelectorAll(adapter.targetSelector).forEach((target) => inject(target));
    // The action row on the video page, when that sub-feature is on
    if (settings.w2gWatchPage && adapter.isWatchPage?.(location)) {
      const bar = document.querySelector(adapter.watchTargetSelector);
      if (bar) {
        const info = injected.get(bar);
        if (!info) inject(bar, 'watch');
        else if (!info.host.isConnected) placePill(bar, info.host); // YouTube re-rendered the row
      }
    } else {
      removeKind('watch');
    }
  };

  // Debounced: YouTube mutates the DOM constantly.
  let enabled = false;
  let observer = null;
  let pending;
  const schedule = () => {
    clearTimeout(pending);
    pending = setTimeout(() => { if (enabled) scan(); }, 300);
  };
  const onNavigate = () => {
    for (const info of injected.values()) info.reset(); // don't carry "Added" over to the next video
    schedule();
  };

  function setEnabled(on) {
    if (on === enabled) return;
    enabled = on;
    if (on) {
      observer = new MutationObserver(schedule);
      observer.observe(document.documentElement, { childList: true, subtree: true });
      document.addEventListener('yt-navigate-finish', onNavigate);
      scan();
    } else {
      observer?.disconnect();
      observer = null;
      document.removeEventListener('yt-navigate-finish', onNavigate);
      clearTimeout(pending);
      removeAll();
    }
  }

  const applySettings = (s) => {
    settings = s;
    setEnabled(s.w2g);
    if (enabled) schedule(); // sub-feature changes (watch page button) need a rescan
  };
  EFY.load().then(applySettings);
  EFY.onChange(applySettings);
})();
