(() => {
  const SUBS_PATH = "/feed/subscriptions";
  const STORE_KEY = "rysl-mode";

  // Heading text (lower-case) -> what that section is
  const HEADINGS = {
    videos: ["videos", "latest"],
    shorts: ["shorts"],
    blocked: ["most relevant"], // always removed
  };

  const SECTION_SELECTOR = [
    "ytd-rich-section-renderer",
    "ytd-rich-shelf-renderer",
    "ytd-shelf-renderer",
    "ytd-reel-shelf-renderer",
    "ytd-item-section-renderer",
    "grid-shelf-view-model",
  ].join(",");

  const HEADING_SELECTOR = [
    "#title",
    "#title-text",
    "h2",
    "h3",
    "yt-formatted-string",
    ".yt-shelf-header-layout__title",
    "[class*='header'] span",
  ].join(",");

  let mode = "videos";
  try { mode = sessionStorage.getItem(STORE_KEY) || "videos"; } catch { /* storage unavailable */ }

  // Defaults apply immediately (no flash on first paint); stored toggles arrive a moment later.
  let settings = { ...EFY.DEFAULTS };
  EFY.load().then((s) => { settings = s; schedule(); });
  EFY.onChange((s) => { settings = s; schedule(); });

  const onSubs = () =>
    (location.pathname.replace(/\/+$/, "") || "/") === SUBS_PATH;

  const getBrowse = () =>
    document.querySelector('ytd-browse[page-subtype="subscriptions"]:not([hidden])') ||
    document.querySelector('ytd-browse[page-subtype="subscriptions"]');

  const visible = (el) => !!el && el.getClientRects().length > 0;

  function classify(text) {
    for (const [kind, list] of Object.entries(HEADINGS)) {
      if (list.some((h) => text === h || text.startsWith(h + " "))) return kind;
    }
    return null;
  }

  // Find section headings, tag their sections, and return the "Videos" heading
  function tagSections(browse) {
    let videosAnchor = null;
    browse.querySelectorAll(HEADING_SELECTOR).forEach((el) => {
      if (el.closest("#rysl-tabs")) return;
      if (el.children.length > 2) return;
      const text = (el.textContent || "").trim().toLowerCase();
      if (!text || text.length > 30) return;
      const kind = classify(text);
      if (!kind) return;

      // The block that holds this heading inside the feed
      const section = el.closest(SECTION_SELECTOR);
      const anchor =
        (section && browse.contains(section) && section) ||
        el.closest("ytd-rich-grid-renderer > *");
      if (!anchor) return;

      anchor.classList.add("rysl-sec-" + kind);

      // Hide YouTube's own "Videos"/"Shorts" title; the tabs replace it
      if (kind !== "blocked") {
        const header =
          el.closest("#header, [id$='header'], [class*='shelf-header']") || el;
        if (anchor.contains(header) && header !== anchor) {
          header.classList.add("rysl-hidden-title");
        } else {
          el.classList.add("rysl-hidden-title");
        }
      }
      if (kind === "videos" && !videosAnchor) videosAnchor = anchor;
    });
    return videosAnchor;
  }

  function buildTabs() {
    const bar = document.createElement("div");
    bar.id = "rysl-tabs";
    bar.setAttribute("role", "tablist");
    bar.innerHTML =
      '<button type="button" role="tab" data-mode="videos">Videos</button>' +
      '<button type="button" role="tab" data-mode="shorts">Shorts</button>' +
      '<span class="rysl-note">No Shorts loaded here. ' +
      '<a href="/feed/subscriptions/shorts">Open all subscription Shorts</a></span>' +
      '<span class="rysl-slot"></span>';
    bar.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-mode]");
      if (!btn) return;
      setMode(btn.dataset.mode);
      window.scrollTo({ top: 0 });
    });
    return bar;
  }

  function placeTabs(browse, videosAnchor) {
    let bar = document.getElementById("rysl-tabs") || buildTabs();
    let target = videosAnchor;
    if (!target) {
      const grid = [...browse.querySelectorAll("ytd-rich-grid-renderer")].find(visible);
      target = grid && grid.firstElementChild;
    }
    if (!target || !target.parentElement) return null;
    if (bar.nextElementSibling !== target) target.parentElement.insertBefore(bar, target);
    return bar;
  }

  // Where "All subscriptions" came from, so it can go back when a toggle is switched off
  let moved = null;

  function restoreAllSubscriptions() {
    if (!moved) return;
    const { control, parent, next } = moved;
    moved = null;
    control.classList.remove("rysl-moved");
    if (parent.isConnected) parent.insertBefore(control, next && next.parentNode === parent ? next : null);
  }

  function removeTabs() {
    const bar = document.getElementById("rysl-tabs");
    if (!bar) return;
    restoreAllSubscriptions();
    bar.remove();
  }

  // Move YouTube's "All subscriptions" control onto the same row as the tabs
  function moveAllSubscriptions(browse, bar) {
    const slot = bar.querySelector(".rysl-slot");
    if (slot.querySelector(".rysl-moved")) return;

    const label = [...browse.querySelectorAll("a, button, span, yt-formatted-string, div")].find(
      (el) =>
        !el.closest("#rysl-tabs") &&
        el.children.length <= 2 &&
        /^all subscriptions$/i.test((el.textContent || "").trim())
    );
    if (!label) return;

    // Climb to the outermost wrapper that holds only this control
    let control = label.closest("a, button") || label;
    while (
      control.parentElement &&
      control.parentElement !== browse &&
      (control.parentElement.textContent || "").trim().toLowerCase() === "all subscriptions" &&
      !control.parentElement.matches("ytd-rich-grid-renderer, #contents, " + SECTION_SELECTOR)
    ) {
      control = control.parentElement;
    }

    const oldRow = control.parentElement;
    moved = { control, parent: oldRow, next: control.nextSibling };
    control.classList.add("rysl-moved");
    slot.appendChild(control);

    // Hide the row it came from if nothing visible is left in it
    if (oldRow && !(oldRow.textContent || "").trim() && !oldRow.querySelector("img, button, a")) {
      oldRow.classList.add("rysl-hidden-title");
    }
  }

  function expandShorts(browse) {
    browse.querySelectorAll(".rysl-sec-shorts").forEach((sec) => {
      if (sec.dataset.ryslExpanded) return;
      const btn = [...sec.querySelectorAll("button, tp-yt-paper-button")].find((b) =>
        /show more/i.test(b.textContent || b.getAttribute("aria-label") || "")
      );
      if (btn) {
        sec.dataset.ryslExpanded = "1";
        btn.click();
      }
    });
  }

  function setMode(m) {
    mode = m === "shorts" ? "shorts" : "videos";
    try { sessionStorage.setItem(STORE_KEY, mode); } catch { /* storage unavailable */ }
    schedule();
  }

  function apply() {
    const root = document.documentElement;
    const active = onSubs();
    const blockedOn = active && settings.hideMostRelevant;
    const tabsOn = active && settings.tabs;
    root.classList.toggle("rysl-on", active);
    root.classList.toggle("rysl-f-blocked", blockedOn);
    root.classList.toggle("rysl-f-tabs", tabsOn);
    root.classList.toggle("rysl-mode-videos", tabsOn && mode === "videos");
    root.classList.toggle("rysl-mode-shorts", tabsOn && mode === "shorts");
    if (!tabsOn) removeTabs();
    if (!blockedOn && !tabsOn) return;
    const browse = getBrowse();
    if (!browse) return;

    const videosAnchor = tagSections(browse);
    if (!tabsOn) return;
    const bar = placeTabs(browse, videosAnchor);
    if (mode === "shorts") expandShorts(browse);

    if (bar) {
      if (settings.allSubsInRow) moveAllSubscriptions(browse, bar);
      else restoreAllSubscriptions();
      bar.querySelectorAll("button[data-mode]").forEach((b) => {
        const on = b.dataset.mode === mode;
        b.classList.toggle("rysl-active", on);
        b.setAttribute("aria-selected", on);
      });
      const hasShorts =
        !!browse.querySelector(".rysl-sec-shorts, ytd-reel-shelf-renderer") ||
        !!browse.querySelector('ytd-rich-item-renderer a[href^="/shorts/"]');
      bar.classList.toggle("rysl-empty", mode === "shorts" && !hasShorts);
    }
  }

  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      apply();
    });
  }

  // DOM churn is constant on YouTube (infinite scroll, hover previews), so
  // mutation-driven runs are debounced and skipped entirely off the subs page.
  let timer = 0;
  const onMutation = () => {
    if (!onSubs() && !document.documentElement.classList.contains("rysl-on")) return;
    clearTimeout(timer);
    timer = setTimeout(schedule, 100);
  };

  document.addEventListener("yt-navigate-finish", schedule);
  window.addEventListener("popstate", schedule);
  new MutationObserver(onMutation).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  schedule();
})();
