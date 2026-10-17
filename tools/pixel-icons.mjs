// Draws the small pixel-art icons used by the popup's menu items.
//   npm run assets
// Each icon is a 16x16 grid on the same navy rounded tile as the extension icon (so it reads on light and dark
// popups), written as a crisp SVG to ui/pixel/. The popup shows them at 32x32 (an exact 2x).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "ui", "pixel");
const N = 16;

const C = {
  rim: "#6f8fe0", body: "#1b2a5c", band: "#2b3f7e",
  ink: "#0c2f66", light: "#d4fffa", mid: "#7ff0ff", blue: "#4aa8ff",
  yellow: "#FDBD00", white: "#E8EDF4", cyan: "#7ff0ff", purple: "#b08cff",
};

function blank() {
  const g = Array.from({ length: N }, () => Array(N).fill(null));
  const put = (x, y, c) => { if (x >= 0 && y >= 0 && x < N && y < N) g[y][x] = c; };
  const rect = (x1, y1, x2, y2, c) => { for (let y = y1; y <= y2; y++) for (let x = x1; x <= x2; x++) put(x, y, c); };
  // the tile: rim, body, lighter top band, rounded corners
  rect(0, 0, 15, 15, C.rim);
  rect(1, 1, 14, 14, C.body);
  rect(1, 1, 14, 2, C.band);
  for (const [x, y] of [[0, 0], [1, 0], [0, 1], [15, 0], [14, 0], [15, 1], [0, 15], [1, 15], [0, 14], [15, 15], [14, 15], [15, 14]]) put(x, y, null);
  for (const [x, y] of [[1, 1], [14, 1], [1, 14], [14, 14]]) put(x, y, C.rim);
  return { g, put, rect };
}

// Straight line between two points, one pixel wide
function line(put, x1, y1, x2, y2, c) {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let i = 0; i <= steps; i++) {
    put(Math.round(x1 + ((x2 - x1) * i) / (steps || 1)), Math.round(y1 + ((y2 - y1) * i) / (steps || 1)), c);
  }
}

const icons = {
  // a video card with a play triangle (the extension icon's front card)
  youtube() {
    const { g, put, rect } = blank();
    rect(2, 4, 13, 12, C.ink);
    rect(3, 5, 12, 11, C.light);
    rect(3, 7, 12, 9, C.mid);
    rect(3, 10, 12, 11, C.blue);
    for (const [x, y] of [[2, 4], [13, 4], [2, 12], [13, 12]]) put(x, y, C.body);
    for (const [x, y] of [[6, 6], [6, 7], [7, 7], [6, 8], [7, 8], [8, 8], [6, 9], [7, 9], [6, 10]]) put(x, y, C.ink);
    return g;
  },
  // the coloured W: a yellow stroke and a light stroke, two pixels thick
  w2g() {
    const { g, put } = blank();
    for (const dx of [0, 1]) {
      line(put, 2 + dx, 4, 4 + dx, 11, C.yellow);
      line(put, 4 + dx, 11, 7 + dx, 6, C.yellow);
      line(put, 7 + dx, 6, 10 + dx, 11, C.white);
      line(put, 10 + dx, 11, 12 + dx, 4, C.white);
    }
    return g;
  },
  // two arrows going opposite ways: export and import
  share() {
    const { g, put } = blank();
    const right = (r, c) => {
      for (let x = 3; x <= 12; x++) put(x, r, c);
      for (const [x, y] of [[11, r - 1], [11, r + 1], [10, r - 2], [10, r + 2]]) put(x, y, c);
    };
    const left = (r, c) => {
      for (let x = 3; x <= 12; x++) put(x, r, c);
      for (const [x, y] of [[4, r - 1], [4, r + 1], [5, r - 2], [5, r + 2]]) put(x, y, c);
    };
    right(5, C.cyan);
    left(10, C.purple);
    return g;
  },
  // two bars: the master pause switch
  pause() {
    const { g, rect } = blank();
    rect(4, 4, 6, 11, C.light);
    rect(9, 4, 11, 11, C.light);
    return g;
  },
};

// One <rect> per horizontal run of the same colour
function toSvg(g) {
  const rects = [];
  for (let y = 0; y < N; y++) {
    let x = 0;
    while (x < N) {
      const c = g[y][x];
      if (!c) { x++; continue; }
      let w = 1;
      while (x + w < N && g[y][x + w] === c) w++;
      rects.push(`<rect x="${x}" y="${y}" width="${w}" height="1" fill="${c}"/>`);
      x += w;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${N} ${N}" width="${N}" height="${N}" shape-rendering="crispEdges">\n  ${rects.join("\n  ")}\n</svg>\n`;
}

fs.mkdirSync(outDir, { recursive: true });
for (const [name, draw] of Object.entries(icons)) fs.writeFileSync(path.join(outDir, `${name}.svg`), toSvg(draw()));
console.log("Wrote ui/pixel/" + Object.keys(icons).map((n) => n + ".svg").join(", "));
