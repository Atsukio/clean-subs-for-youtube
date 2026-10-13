// Feature toggles shared by the content scripts and the popup (classic script,
// exposes globalThis.EFY). Toggles sync across devices; the W2G API key and
// rooms are kept separately in chrome.storage.local and never synced.
(() => {
  const KEY = "settings";
  const DEFAULTS = {
    paused: false,              // master switch: everything below behaves as off while true

    // YouTube: Subscriptions page
    hideMostRelevant: true,     // hide "Most relevant" and other extra shelves
    tabs: true,                 // sticky Videos | Shorts tabs
    allSubsInRow: true,         // keep "All subscriptions" on the tab row
    hideWatched: false,         // dim or hide videos that are (almost) fully watched
    watchedMode: "dim",         // "dim" | "hide"
    hideByText: false,          // hide videos by title keyword or channel name
    blockedWords: [],
    blockedChannels: [],
    hideShort: false,           // hide videos shorter than minMinutes
    minMinutes: 5,

    // YouTube: video page
    hideAsk: false,             // hide the "Ask" (Gemini) button in the action row

    // YouTube: all pages
    hideShortsEverywhere: false,

    // Watch2Gether
    w2gThumbs: false,           // "add to Watch2Gether" button on video thumbnails
    w2gWatchPage: false,        // the W2G button next to Like and Dislike on the video page
  };

  // What every feature flag becomes while paused
  const OFF = {
    hideMostRelevant: false, tabs: false, allSubsInRow: false, hideWatched: false,
    hideByText: false, hideShort: false, hideAsk: false, hideShortsEverywhere: false,
    w2gThumbs: false, w2gWatchPage: false,
  };

  // Before the two W2G buttons had a switch each there was one, `w2g`, with `w2gWatchPage` (on by default) for the video
  // page. Carry that over once; the old key is not written back.
  function migrate(stored) {
    if (!stored || !('w2g' in stored) || 'w2gThumbs' in stored) return stored;
    const { w2g, ...rest } = stored;
    return { ...rest, w2gThumbs: !!w2g, w2gWatchPage: !!w2g && stored.w2gWatchPage !== false };
  }

  const withDefaults = (stored) => ({ ...DEFAULTS, ...migrate(stored) });
  const effective = (s) => (s.paused ? { ...s, ...OFF } : s);

  // The stored settings, exactly as saved (the popup edits these)
  async function loadRaw() {
    try {
      return withDefaults((await chrome.storage.sync.get(KEY))[KEY]);
    } catch {
      return { ...DEFAULTS };
    }
  }

  // The settings features should act on: paused turns every feature off
  async function load() {
    return effective(await loadRaw());
  }

  async function save(patch) {
    const next = { ...(await loadRaw()), ...patch };
    await chrome.storage.sync.set({ [KEY]: next });
    return next;
  }

  function onChange(callback) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync" && changes[KEY]) callback(effective(withDefaults(changes[KEY].newValue)));
    });
  }

  // Keep only known keys with the right type, so a pasted settings code can't inject anything odd
  function sanitize(input) {
    const out = {};
    if (!input || typeof input !== "object") return out;
    const list = (v) => (Array.isArray(v)
      ? v.filter((x) => typeof x === "string").map((x) => x.trim().slice(0, 80)).filter(Boolean).slice(0, 100)
      : null);
    for (const [key, def] of Object.entries(DEFAULTS)) {
      const v = input[key];
      if (v === undefined) continue;
      if (Array.isArray(def)) {
        const cleaned = list(v);
        if (cleaned) out[key] = cleaned;
      } else if (key === "watchedMode") {
        if (v === "dim" || v === "hide") out[key] = v;
      } else if (key === "minMinutes") {
        const n = Number(v);
        if (Number.isFinite(n)) out[key] = Math.min(600, Math.max(1, Math.round(n)));
      } else if (typeof v === typeof def) {
        out[key] = v;
      }
    }
    return out;
  }

  globalThis.EFY = { DEFAULTS, load, loadRaw, save, onChange, sanitize };
})();
