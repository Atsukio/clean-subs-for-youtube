(() => {
  const adapter = (window.W2GAdapters || []).find((a) => a.matches(location));
  if (!adapter) return;

  const MARK = 'data-w2g-injected';
  const RESULT_MS = 3000; // how long a result stays before the button resets
  const ERROR_MS = 8000;  // errors stay longer: the tooltip carries the reason
  // Two-tone "W" mark with a "+" while idle. `ink` is the colour of the "+" and the second stroke of the W.
  const icon = (ink) => `<svg viewBox="0 0 36 24" width="30" height="20" fill="none" stroke-width="3.4"
    stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path fill="none" class="plus" d="M6 7.5v9M1.5 12h9" stroke="${ink}" stroke-width="2.6"/>
    <g transform="translate(12 0)"><path fill="none" d="M3 5l4.5 14L12 9" stroke="#FDBD00"/><path fill="none" d="M12 9l4.5 10L21 5" stroke="${ink === '#fff' ? '#E8EDF4' : ink}"/></g></svg>`;

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
  // Video page fallback pill (used only until a real YouTube button exists to copy, see createNativePill).
  // Sized like YouTube's size-M buttons (40px, 20px radius). Colours come from YouTube's current
  // --yt-sys-color-baseline--* variables, with fixed per-theme fallbacks chosen via data-theme (detected below);
  // the older --yt-spec-* variables do not exist on the real page.
  const STYLE_PILL = `
    :host { all: initial; display: inline-flex; align-items: center; margin-left: 8px; }
    button { all: initial; box-sizing: border-box; display: inline-flex; align-items: center; gap: 6px;
      height: 40px; padding: 0 16px 0 12px; font: 500 14px/18px Roboto, Arial, sans-serif; white-space: nowrap;
      color: var(--yt-sys-color-baseline--text-primary, #0f0f0f);
      background: var(--yt-sys-color-baseline--additive-background, rgba(0,0,0,.05));
      border-radius: 20px; cursor: pointer; }
    button:hover { background: var(--yt-sys-color-baseline--button-chip-background-hover, rgba(0,0,0,.1)); }
    :host([data-theme="dark"]) button { color: var(--yt-sys-color-baseline--text-primary, #f1f1f1); background: var(--yt-sys-color-baseline--additive-background, rgba(255,255,255,.1)); }
    :host([data-theme="dark"]) button:hover { background: var(--yt-sys-color-baseline--button-chip-background-hover, rgba(255,255,255,.2)); }
    button:not([data-state="idle"]) .plus { display: none; }
    button[data-state="loading"] { opacity: .7; cursor: wait; }
    button[data-state="added"] { box-shadow: inset 0 0 0 2px #2e9d4f; }
    button[data-state="error"] { box-shadow: inset 0 0 0 2px #c0392b; }
  `;
  const LABELS_THUMB = { idle: '', loading: '…', added: 'Added', error: 'Error' };
  const LABELS_PILL = { idle: 'W2G', loading: '…', added: 'Added', error: 'Error' };

  // Is YouTube in dark mode? Its html[dark] marker first, then the page's actual background colour.
  function pageIsDark() {
    if (document.documentElement.hasAttribute('dark')) return true;
    for (const el of [document.body, document.documentElement]) {
      const c = (getComputedStyle(el).backgroundColor.match(/[\d.]+/g) || []).map(Number);
      if (c.length >= 3 && (c.length === 3 || c[3] > 0)) return 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2] < 128;
    }
    return false;
  }
  const applyTheme = (host) => { host.dataset.theme = pageIsDark() ? 'dark' : 'light'; };

  // The pill that matches YouTube's own buttons: a plain <button> that reuses the class names of a real
  // sibling (Share, Download...) read at runtime, so size, font, shape, colours, hover and light/dark mode all
  // come from YouTube's CSS and survive it renaming things. Returns null when there is no sibling to copy yet.
  const OUR_CLASS = 'efy-w2g-native';
  // YouTube's button shape classes appear as ytSpecButtonShapeNext... (current) or yt-spec-button-shape-next... (older)
  const SHAPE_CLASS = /yt-?spec-?button-?shape/i;
  const ICON_PART = '[class*="ButtonShapeNextIcon" i], [class*="button-shape-next__icon"]';
  const TEXT_PART = '[class*="ButtonShapeNextButtonTextContent" i], [class*="button-shape-next__button-text-content"]';
  const NOT_SIBLING = 'segmented-like-dislike-button-view-model, ytd-segmented-like-dislike-button-renderer, ' +
    'like-button-view-model, dislike-button-view-model, .' + OUR_CLASS;

  function createNativePill(bar, readVideo) {
    // Copy from a real button anywhere in the action menu (Share, Ask, Save... sit in a different container than the
    // one we are placed in), skipping the like group, icon-only buttons and anything of ours.
    const scope = bar.closest('ytd-menu-renderer') || bar;
    const sibling = [...scope.querySelectorAll('button')].find(
      (b) => SHAPE_CLASS.test(b.className) && !/IconButton/i.test(b.className) && !b.closest(NOT_SIBLING)
    );
    if (!sibling) return null;
    const classOf = (selector) => sibling.querySelector(selector)?.className || '';

    // Rebuild the wrapper chain the real button sits in (yt-button-view-model > button-view-model), element names and
    // classes included, so YouTube's own styling and spacing rules for those apply to our button as well.
    const chain = [];
    const row = sibling.closest('#flexible-item-buttons, #top-level-buttons-computed') || bar;
    for (let el = sibling.parentElement; el && el !== row; el = el.parentElement) chain.unshift(el);
    let host = null;
    let holder = null;
    for (const original of chain) {
      const copy = document.createElement(original.tagName.toLowerCase());
      copy.className = original.className;
      if (holder) holder.append(copy); else host = copy;
      holder = copy;
    }
    if (!host) { host = document.createElement('div'); holder = host; }
    host.classList.add(OUR_CLASS);
    if (chain.length) host.style.display = getComputedStyle(chain[0]).display;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = sibling.className;
    const iconBox = document.createElement('div');
    iconBox.className = classOf(ICON_PART);
    iconBox.setAttribute('aria-hidden', 'true');
    const glyph = document.createElement('div');
    glyph.style.cssText = 'width:28px;height:19px;display:block;flex:none;margin:0 -2px;';
    glyph.innerHTML = icon('currentColor');
    const svg = glyph.querySelector('svg');
    svg.setAttribute('width', '28');
    svg.setAttribute('height', '19');
    svg.style.pointerEvents = 'none';
    const plus = glyph.querySelector('.plus');
    iconBox.append(glyph);
    const text = document.createElement('div');
    text.className = classOf(TEXT_PART);
    btn.append(iconBox, text);

    // YouTube's hover/press highlight is a <yt-touch-feedback-shape> holding a stroke and a fill. Rebuild it from plain
    // elements with the same classes (read from the sibling, with the known names as a fallback) and drive the fill's
    // opacity here, because YouTube's own script is not attached to a button we create.
    const feedbackClass = (selector, fallback) => sibling.querySelector(selector)?.className || fallback;
    const feedback = document.createElement('div');
    feedback.setAttribute('aria-hidden', 'true');
    feedback.className = feedbackClass('[class*="TouchFeedbackShapeHost"]', 'ytSpecTouchFeedbackShapeHost ytSpecTouchFeedbackShapeTouchResponse');
    const stroke = document.createElement('div');
    stroke.className = feedbackClass('[class*="TouchFeedbackShapeStroke"]', 'ytSpecTouchFeedbackShapeStroke');
    const fill = document.createElement('div');
    fill.className = feedbackClass('[class*="TouchFeedbackShapeFill"]', 'ytSpecTouchFeedbackShapeFill');
    feedback.append(stroke, fill);
    btn.append(feedback);
    // ...and the static rim light (<yt-light-shape> with a wash child), same idea: plain elements, same classes
    const light = sibling.querySelector('[class*="LightShapeHost" i]');
    if (light) {
      const lightHost = document.createElement('div');
      lightHost.setAttribute('aria-hidden', 'true');
      lightHost.className = light.className;
      lightHost.setAttribute('style', '--yt-light-wash-opacity: 0; --yt-light-wash-x: 0px; --yt-light-wash-y: 0px; --yt-light-wash-size: 0px;');
      if (light.firstElementChild) {
        const wash = document.createElement('div');
        wash.className = light.firstElementChild.className;
        lightHost.append(wash);
      }
      btn.append(lightHost);
    }
    holder.append(btn);
    const layer = (opacity) => { fill.style.opacity = opacity; };
    btn.addEventListener('pointerenter', () => layer('0.1'));
    btn.addEventListener('pointerleave', () => layer(''));
    btn.addEventListener('pointerdown', () => layer('0.2'));
    btn.addEventListener('pointerup', () => layer('0.1'));

    let timer;
    const setState = (state, title = '') => {
      text.textContent = LABELS_PILL[state];
      if (plus) plus.style.display = state === 'idle' ? '' : 'none'; // the "+" only while idle
      btn.title = title || (state === 'idle' ? 'Add to W2G' : '');
      btn.style.opacity = state === 'loading' ? '0.7' : '';
      btn.style.boxShadow = state === 'added' ? 'inset 0 0 0 2px #2e9d4f' : state === 'error' ? 'inset 0 0 0 2px #c0392b' : '';
    };
    setState('idle');
    for (const type of ['mousedown', 'mouseup', 'pointerdown', 'pointerup']) {
      btn.addEventListener(type, (e) => e.stopPropagation());
    }
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (btn.dataset.busy) return;
      const video = readVideo();
      const done = (state, title) => {
        delete btn.dataset.busy;
        setState(state, title);
        clearTimeout(timer);
        timer = setTimeout(() => setState('idle'), state === 'error' ? ERROR_MS : RESULT_MS);
      };
      if (!video) return done('error', 'Could not find the video link.');
      btn.dataset.busy = '1';
      setState('loading');
      try {
        const res = await chrome.runtime.sendMessage({ type: 'add', ...video });
        if (res.status === 'error') console.warn('[Clean Subs]', res.message);
        done(res.status, res.message || '');
      } catch {
        done('error', 'Extension was reloaded. Refresh the page.');
      }
    });

    const reset = () => { clearTimeout(timer); delete btn.dataset.busy; setState('idle'); };
    return { host, reset };
  }

  // Make the gap between the like group and our pill equal the gap YouTube leaves between its own buttons (Share, Ask,
  // Save...), measured in pixels. With the rebuilt wrapper chain this is normally already right and nothing changes.
  function matchSpacing(host) {
    const rect = (el) => el.getBoundingClientRect();
    const prev = host.previousElementSibling; // the like group
    if (!prev || rect(prev).width === 0) return;
    if (Math.abs((rect(prev).top + rect(prev).bottom) - (rect(host).top + rect(host).bottom)) > 20) return; // wrapped to another row
    let target = 8; // YouTube's usual gap, used if there is no pair of its own buttons to measure
    const own = [...(host.closest('ytd-menu-renderer')?.querySelectorAll('#flexible-item-buttons > *') || [])]
      .filter((el) => rect(el).width > 0);
    if (own.length > 1) {
      const gap = rect(own[1]).left - rect(own[0]).right;
      if (gap >= 0 && gap <= 32) target = gap;
    }
    const current = parseFloat(getComputedStyle(host).marginLeft) || 0;
    const wanted = Math.max(0, current + target - (rect(host).left - rect(prev).right));
    if (Math.abs(wanted - current) > 0.5) host.style.marginLeft = wanted + 'px';
  }

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
      }, state === 'error' ? ERROR_MS : RESULT_MS);
    }

    // Back to idle, e.g. when YouTube moves on to another video without reloading the page
    const reset = () => { clearTimeout(timer); setState('idle'); host.keepVisible = false; };

    if (pill) applyTheme(host); else root.host.style.display = 'none';
    return { host, reset };
  }

  // target -> what was added for it, so switching the feature off can undo everything.
  const injected = new Map();

  // The pill sits right after the Like/Dislike group, or first in the row if that can't be found. Safe to call
  // repeatedly: it only touches the DOM when the pill is not already in the right place.
  function placePill(bar, host) {
    const likes = bar.querySelector('segmented-like-dislike-button-view-model, ytd-segmented-like-dislike-button-renderer');
    if (likes) {
      if (likes.nextElementSibling !== host) likes.after(host);
    } else if (host.parentElement !== bar) {
      bar.prepend(host);
    }
  }

  function inject(target, kind = 'thumb') {
    if (injected.has(target)) return;
    target.setAttribute(MARK, '');
    if (kind === 'watch') {
      const readVideo = () => adapter.getWatchVideo();
      const native = createNativePill(target, readVideo);
      const { host, reset } = native || createButton(target, readVideo, 'pill');
      placePill(target, host);
      injected.set(target, { host, reset, native: !!native, kind });
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
      const bar = adapter.getWatchTarget?.();
      if (bar) {
        if (!injected.has(bar)) inject(bar, 'watch');
        const info = injected.get(bar);
        if (!info.native) {
          // YouTube's own buttons can render after ours: switch to the native-looking pill once there is one to copy
          const native = createNativePill(bar, () => adapter.getWatchVideo());
          if (native) {
            info.host.replaceWith(native.host);
            Object.assign(info, native, { native: true });
          }
        }
        placePill(bar, info.host); // also re-attaches the pill if YouTube re-rendered the row
        if (info.native) matchSpacing(info.host);
        else applyTheme(info.host); // the user may have switched YouTube's theme
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
