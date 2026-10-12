(() => {
  const adapter = (window.W2GAdapters || []).find((a) => a.matches(location));
  if (!adapter) return;

  const MARK = 'data-w2g-injected';
  const RESULT_MS = 3000; // how long the result message stays before resetting
  // Two-tone "W" mark with a "+" while idle; a text label replaces the "+" while a result is displayed.
  const ICON = `<svg viewBox="0 0 36 24" width="30" height="20" fill="none" stroke-width="3.4"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path class="plus" d="M6 7.5v9M1.5 12h9" stroke="#fff" stroke-width="2.6"/>
    <g transform="translate(12 0)"><path d="M3 5l4.5 14L12 9" stroke="#FDBD00"/><path d="M12 9l4.5 10L21 5" stroke="#E8EDF4"/></g></svg>`;
  const STYLE = `
    :host { all: initial; position: absolute; top: 8px; left: 8px; z-index: 2147483647; display: none; }
    /* Mirrors YouTube's own thumbnail overlay buttons (Watch later etc.). */
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
  const LABELS = { idle: '', loading: '…', added: 'Added', error: 'Error' };

  function createButton(target) {
    const host = document.createElement('div');
    const root = host.attachShadow({ mode: 'closed' });
    root.innerHTML = `<style>${STYLE}</style><button type="button">${ICON}<span></span></button>`;
    const btn = root.querySelector('button');
    const label = root.querySelector('span');
    let timer;

    const setState = (state, title = '') => {
      btn.dataset.state = state;
      label.textContent = LABELS[state];
      btn.title = title || (state === 'idle' ? 'Add to W2G' : '');
    };
    setState('idle');

    // Swallow everything so the site never sees the click and opens the video.
    for (const type of ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup']) {
      btn.addEventListener(type, (e) => { e.stopPropagation(); e.preventDefault(); });
    }
    btn.addEventListener('click', async () => {
      if (btn.dataset.state === 'loading') return;
      const video = adapter.getVideo(target); // read at click time: YouTube recycles elements
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
      host.style.display = 'block';
      clearTimeout(timer);
      timer = setTimeout(() => {
        setState('idle');
        host.keepVisible = false;
        if (!target.matches(':hover')) host.style.display = 'none';
      }, RESULT_MS);
    }

    root.host.style.display = 'none';
    return host;
  }

  // target -> what was added to it, so switching the feature off can undo everything.
  const injected = new Map();

  function inject(target) {
    if (injected.has(target)) return;
    target.setAttribute(MARK, '');
    const madeRelative = getComputedStyle(target).position === 'static';
    if (madeRelative) target.style.position = 'relative';
    const host = createButton(target);
    target.appendChild(host);
    const enter = () => { host.style.display = 'block'; };
    const leave = () => { if (!host.keepVisible) host.style.display = 'none'; };
    target.addEventListener('mouseenter', enter);
    target.addEventListener('mouseleave', leave);
    injected.set(target, { host, enter, leave, madeRelative });
  }

  function removeAll() {
    for (const [target, { host, enter, leave, madeRelative }] of injected) {
      host.remove();
      target.removeEventListener('mouseenter', enter);
      target.removeEventListener('mouseleave', leave);
      target.removeAttribute(MARK);
      if (madeRelative) target.style.position = '';
    }
    injected.clear();
  }

  const scan = () => {
    // YouTube recycles and detaches thumbnails; forget the ones that are gone.
    for (const target of injected.keys()) if (!target.isConnected) injected.delete(target);
    document.querySelectorAll(adapter.targetSelector).forEach(inject);
  };

  // Debounced: YouTube mutates the DOM constantly.
  let enabled = false;
  let observer = null;
  let pending;
  const schedule = () => {
    clearTimeout(pending);
    pending = setTimeout(() => { if (enabled) scan(); }, 300);
  };

  function setEnabled(on) {
    if (on === enabled) return;
    enabled = on;
    if (on) {
      observer = new MutationObserver(schedule);
      observer.observe(document.documentElement, { childList: true, subtree: true });
      document.addEventListener('yt-navigate-finish', schedule);
      scan();
    } else {
      observer?.disconnect();
      observer = null;
      document.removeEventListener('yt-navigate-finish', schedule);
      clearTimeout(pending);
      removeAll();
    }
  }

  EFY.load().then((s) => setEnabled(s.w2g));
  EFY.onChange((s) => setEnabled(s.w2g));
})();
