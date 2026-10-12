// Feature toggles shared by the content scripts and the popup (classic script,
// exposes globalThis.EFY). Toggles sync across devices; the W2G API key and
// room are kept separately in chrome.storage.local and never synced.
(() => {
  const KEY = "settings";
  const DEFAULTS = {
    hideMostRelevant: true, // hide "Most relevant" and other extra Subscriptions shelves
    tabs: true,             // sticky Videos | Shorts tabs on the Subscriptions page
    allSubsInRow: true,     // keep "All subscriptions" on the tab row
    w2g: false,             // "add to Watch2Gether" button on video thumbnails
  };

  async function load() {
    try {
      const stored = (await chrome.storage.sync.get(KEY))[KEY];
      return { ...DEFAULTS, ...stored };
    } catch {
      return { ...DEFAULTS };
    }
  }

  async function save(patch) {
    const next = { ...(await load()), ...patch };
    await chrome.storage.sync.set({ [KEY]: next });
    return next;
  }

  function onChange(callback) {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === "sync" && changes[KEY]) callback({ ...DEFAULTS, ...changes[KEY].newValue });
    });
  }

  globalThis.EFY = { DEFAULTS, load, save, onChange };
})();
