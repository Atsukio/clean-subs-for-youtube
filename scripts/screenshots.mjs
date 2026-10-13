// Renders the Web Store screenshots (1280x800) from store-assets/screenshot.html.
//   npm run screenshots
// Needs Microsoft Edge or Google Chrome installed. The popup scene embeds the real popup,
// generated here from popup/popup.html with a stubbed chrome.* API and fake example data.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "store-assets");
const outDir = path.join(assets, "screenshots");

const browser = [
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
].find((p) => fs.existsSync(p));
if (!browser) throw new Error("Install Chrome or Edge to render the screenshots.");

// Popup preview: popup.html lives one folder below the repo root, like store-assets/, so
// only the files next to it need re-pointing.
const stub = `<script>
  // Which group is open: #h-w2g (the Watch2Gether scene) shows that one, anything else shows YouTube.
  // (localStorage is not usable on file:// pages, so this sets the state directly once the page is parsed.)
  document.addEventListener('DOMContentLoaded', () => {
    const show = location.hash === '#h-w2g' ? 'w2g' : 'yt';
    document.querySelectorAll('details.group').forEach((d) => { d.open = d.dataset.group === show; });
  });
  const sync = { settings: { hideWatched: true, watchedMode: 'dim', hideShortsEverywhere: true, w2gThumbs: true, w2gWatchPage: true } };
  const local = {
    streamkey: 'example-room',
    apiKey: 'example',
    rooms: [{ name: 'Friday movie night', streamkey: 'example-room' }, { name: 'Anime club', streamkey: 'example-two' }],
  };
  const area = (d) => ({
    get: async (k) => (Array.isArray(k) ? Object.fromEntries(k.map((x) => [x, d[x]])) : { [k]: d[k] }),
    set: async (o) => Object.assign(d, o),
    remove: async () => {},
  });
  window.chrome = {
    storage: { sync: area(sync), local: area(local), onChanged: { addListener() {} } },
    permissions: { request: async () => true, remove: async () => true },
    runtime: { sendMessage: async () => ({ ok: true, message: 'ok' }) },
  };
</script>
`;
const popup = fs
  .readFileSync(path.join(root, "popup", "popup.html"), "utf8")
  .replace(/(href|src)="(?!\.\.\/|https?:)([^"]+)"/g, '$1="../popup/$2"')
  .replace("<link", stub + "<link");
fs.writeFileSync(path.join(assets, "popup-preview.html"), popup);

fs.mkdirSync(outDir, { recursive: true });
const page = pathToFileURL(path.join(assets, "screenshot.html")).href;
const scenes = [
  ["subs", "01-subscriptions.png"],
  ["w2g", "02-watch2gether-thumbnails.png"],
  ["watch", "03-watch2gether-video-page.png"],
  ["settings", "04-settings.png"],
  ["settings-w2g", "05-settings-watch2gether.png"],
];
for (const [scene, file] of scenes) {
  execFileSync(
    browser,
    [
      "--headless",
      "--disable-gpu",
      "--allow-file-access-from-files",
      "--hide-scrollbars",
      "--window-size=1280,800",
      "--blink-settings=preferredColorScheme=0", // dark, to match the page (0 is dark in Blink)
      "--virtual-time-budget=3000",
      `--screenshot=${path.join(outDir, file)}`,
      `${page}#${scene}`,
    ],
    { stdio: "ignore" },
  );
  console.log("Wrote store-assets/screenshots/" + file);
}

// Promo images: the small promo tile (required by the store) and the marquee (optional)
const promoDir = path.join(assets, "promo");
fs.mkdirSync(promoDir, { recursive: true });
const promoPage = pathToFileURL(path.join(assets, "promo.html")).href;
for (const [scene, width, height, file] of [
  ["small", 440, 280, "small-promo-440x280.png"],
  ["marquee", 1400, 560, "marquee-1400x560.png"],
]) {
  execFileSync(
    browser,
    [
      "--headless",
      "--disable-gpu",
      "--allow-file-access-from-files",
      "--hide-scrollbars",
      `--window-size=${width},${height}`,
      "--blink-settings=preferredColorScheme=0",
      "--virtual-time-budget=3000",
      `--screenshot=${path.join(promoDir, file)}`,
      `${promoPage}#${scene}`,
    ],
    { stdio: "ignore" },
  );
  console.log("Wrote store-assets/promo/" + file);
}
