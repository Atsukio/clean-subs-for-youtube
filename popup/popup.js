const $ = (id) => document.getElementById(id);

// Access to Watch2Gether is optional: Chrome only asks for it when the W2G
// toggle is switched on, and it is handed back when the toggle is switched off.
const W2G_HOSTS = ['https://api.w2g.tv/*', 'https://w2g.tv/*'];
// The two W2G buttons each have a switch; access to w2g.tv is asked for when the first goes on and handed back once both are off
const W2G_SWITCHES = ['w2gThumbs', 'w2gWatchPage'];
// Requested together with the hosts above, but never removed: youtube.com is already covered by the extension's
// required content-script access, and chrome.permissions.remove() throws "You cannot remove required permissions"
// for anything that is.
const OEMBED = 'https://www.youtube.com/oembed*';

// Accepts a raw streamkey or a w2g.tv room URL: /rooms/<key>,
// or /room/?room_id=<key>. (?access_key= links are not accepted.)
function parseStreamkey(input) {
  const s = input.trim();
  let key = s;
  if (/^https?:\/\//i.test(s)) {
    try {
      const u = new URL(s);
      key = u.searchParams.get('room_id') || u.pathname.match(/\/rooms?\/([\w-]+)/)?.[1] || '';
    } catch { return null; }
  }
  return /^[\w-]+$/.test(key) ? key : null;
}

function say(msg, kind = '') {
  $('status').textContent = msg;
  $('status').className = kind;
}

// ---------- Feature toggles and their options ----------

function renderSettings(settings) {
  document.body.classList.toggle('paused', settings.paused);
  for (const box of document.querySelectorAll('input[data-setting]')) {
    box.checked = !!settings[box.dataset.setting];
    // e.g. "keep All subscriptions on the tab row" only makes sense while the tabs are on
    if (box.dataset.needs) box.disabled = !settings[box.dataset.needs];
  }
  for (const el of document.querySelectorAll('[data-show-when]')) el.hidden = !settings[el.dataset.showWhen];
  for (const el of document.querySelectorAll('[data-hide-when]')) el.hidden = !!settings[el.dataset.hideWhen];
  const anyOn = (keys) => keys.split(' ').some((k) => settings[k]);
  for (const el of document.querySelectorAll('[data-show-when-any]')) el.hidden = !anyOn(el.dataset.showWhenAny);
  for (const el of document.querySelectorAll('[data-hide-when-any]')) el.hidden = anyOn(el.dataset.hideWhenAny);
  for (const el of document.querySelectorAll('[data-value]')) el.value = settings[el.dataset.value];
  for (const el of document.querySelectorAll('[data-list]')) el.value = (settings[el.dataset.list] || []).join('\n');
}

for (const box of document.querySelectorAll('input[data-setting]')) {
  box.addEventListener('change', async () => {
    const key = box.dataset.setting;
    if (W2G_SWITCHES.includes(key)) {
      if (box.checked) {
        // Must be the first await in this handler to count as a user gesture.
        const granted = await chrome.permissions.request({ origins: [...W2G_HOSTS, OEMBED] });
        if (!granted) {
          box.checked = false;
          return say('Chrome did not grant access to w2g.tv, so the button stays off.', 'error');
        }
      } else {
        // Access stays while the other W2G button is still on. A failed removal must never stop the switch from turning
        // off, so it is not allowed to throw out of here.
        const stored = await EFY.loadRaw();
        if (!W2G_SWITCHES.some((k) => k !== key && stored[k])) {
          try { await chrome.permissions.remove({ origins: W2G_HOSTS }); } catch (err) { console.warn('Could not remove W2G access:', err.message); }
        }
      }
    }
    renderSettings(await EFY.save({ [key]: box.checked }));
    say('');
  });
}

// Selects and number fields save as soon as they change
for (const el of document.querySelectorAll('[data-value]')) {
  el.addEventListener('change', async () => {
    const patch = EFY.sanitize({ [el.dataset.value]: el.type === 'number' ? Number(el.value) : el.value });
    renderSettings(await EFY.save(patch)); // re-render shows the value that was actually kept
  });
}

// One entry per line; blank lines and extra whitespace are dropped
for (const el of document.querySelectorAll('[data-list]')) {
  el.addEventListener('change', async () => {
    const patch = EFY.sanitize({ [el.dataset.list]: el.value.split('\n') });
    renderSettings(await EFY.save(patch));
  });
}

// ---------- Watch2Gether key and rooms ----------

async function loadRooms() {
  const { rooms = [], streamkey } = await chrome.storage.local.get(['rooms', 'streamkey']);
  // Earlier versions kept a single room under `streamkey` only
  if (streamkey && !rooms.some((r) => r.streamkey === streamkey)) {
    rooms.push({ name: streamkey, streamkey });
    await chrome.storage.local.set({ rooms });
  }
  return { rooms, active: streamkey };
}

// The "add a room" form stays behind a button, except when there is no room yet and it is the only way forward
function setAddRoomOpen(open) {
  $('add-room').hidden = !open;
  $('add-room-toggle').textContent = open ? 'Cancel' : 'Add another room';
}

const ago = (at) => {
  const minutes = Math.round((Date.now() - at) / 60000);
  return minutes < 1 ? 'just now' : minutes < 60 ? `${minutes} min ago` : `${Math.round(minutes / 60)} h ago`;
};

async function renderRoom() {
  const { apiKey } = await chrome.storage.local.get('apiKey');
  const { rooms, active } = await loadRooms();

  const select = $('room-select');
  select.replaceChildren(...rooms.map((r) => new Option(r.name, r.streamkey)));
  if (!rooms.length) select.append(new Option('No rooms yet', ''));
  select.value = active || '';
  select.disabled = !rooms.length;
  $('room-open').hidden = !active;
  $('room-open').href = active ? `https://w2g.tv/rooms/${active}` : '#';
  $('room-remove').hidden = !active;
  $('add-room-toggle').hidden = !rooms.length;
  if (!rooms.length) setAddRoomOpen(true);

  // The last failed "add to W2G" (kept by the service worker), so the cause is readable after the button resets
  const { lastError } = await chrome.storage.local.get('lastError');
  $('last-error').hidden = !lastError;
  if (lastError) $('last-error').textContent = `Last add failed ${ago(lastError.at)}: ${lastError.message}`;

  // The key is never shown back; blank means "keep the saved one".
  $('apiKey').placeholder = apiKey ? '•••••• saved' : ' ';
  // Float the label and show the placeholder so a stored (never displayed) key is obvious
  $('apiKey-field').classList.toggle('saved', !!apiKey);
  $('apiKey-help').textContent = apiKey
    ? 'A key is saved. Leave blank to keep it.'
    : 'From your Watch2Gether account\'s API page.';
}

$('add-room-toggle').addEventListener('click', () => setAddRoomOpen($('add-room').hidden));

$('room-select').addEventListener('change', async () => {
  await chrome.storage.local.set({ streamkey: $('room-select').value });
  renderRoom();
});

$('room-remove').addEventListener('click', async () => {
  const { rooms, active } = await loadRooms();
  const left = rooms.filter((r) => r.streamkey !== active);
  await chrome.storage.local.set({ rooms: left });
  if (left.length) await chrome.storage.local.set({ streamkey: left[0].streamkey });
  else await chrome.storage.local.remove('streamkey');
  say('Room removed.', 'ok');
  renderRoom();
});

$('save').addEventListener('click', async () => {
  // Either part may be saved on its own; a blank field keeps what's already stored.
  const update = {};
  const key = $('apiKey').value.trim();
  if (key) update.apiKey = key;
  const roomText = $('room-input').value.trim();
  if (roomText) {
    const streamkey = parseStreamkey(roomText);
    if (!streamkey) return say('Enter a valid streamkey or room URL.', 'error');
    const { rooms } = await loadRooms();
    const name = $('room-name').value.trim() || streamkey;
    const existing = rooms.find((r) => r.streamkey === streamkey);
    if (existing) existing.name = name; else rooms.push({ name, streamkey });
    update.rooms = rooms;
    update.streamkey = streamkey; // the newly added room becomes the active one
  }
  if (!Object.keys(update).length) return say('Nothing to save.', 'error');
  await chrome.storage.local.set(update);
  if (update.streamkey) setAddRoomOpen(false); // the new room is saved and active; fold the form away again
  $('apiKey').value = '';
  $('room-input').value = '';
  $('room-name').value = '';
  const saved = await chrome.storage.local.get(['apiKey', 'streamkey']);
  const missing = [!saved.apiKey && 'API key', !saved.streamkey && 'room'].filter(Boolean);
  say(missing.length ? `Saved. Still needed: ${missing.join(' and ')}.` : 'Saved.', 'ok');
  renderRoom();
});

$('test').addEventListener('click', async () => {
  say('Testing…');
  const res = await chrome.runtime.sendMessage({ type: 'test' });
  say(res.message, res.ok ? 'ok' : 'error');
  renderRoom();
});

$('forget').addEventListener('click', async () => {
  await chrome.storage.local.remove(['apiKey', 'streamkey', 'rooms']);
  $('apiKey').value = '';
  say('Saved key and rooms removed.', 'ok');
  renderRoom();
});

// ---------- Share settings ----------

// The two W2G switches are left out both ways: they depend on a permission granted per browser.
$('export').addEventListener('click', async () => {
  const shareable = await EFY.loadRaw();
  for (const key of W2G_SWITCHES) delete shareable[key];
  $('share').value = JSON.stringify(shareable, null, 2);
  try {
    await navigator.clipboard.writeText($('share').value);
    say('Settings code copied.', 'ok');
  } catch {
    $('share').select();
    say('Settings code ready. Copy it from the box.', 'ok');
  }
});

$('import').addEventListener('click', async () => {
  let parsed;
  try { parsed = JSON.parse($('share').value); } catch { return say('That is not a valid settings code.', 'error'); }
  const patch = EFY.sanitize(parsed);
  for (const key of W2G_SWITCHES) delete patch[key];
  const count = Object.keys(patch).length;
  if (!count) return say('No settings found in that code.', 'error');
  renderSettings(await EFY.save(patch));
  say(`Imported ${count} setting${count === 1 ? '' : 's'}.`, 'ok');
});

// ---------- Collapsible groups ----------

// Remember which groups are open between popup openings (browser storage can be unavailable; then the defaults apply)
const OPEN_KEY = 'efy-open';
let openState = {};
try { openState = JSON.parse(localStorage.getItem(OPEN_KEY) || '{}'); } catch { /* storage unavailable */ }
for (const group of document.querySelectorAll('details.group')) {
  if (group.dataset.group in openState) group.open = !!openState[group.dataset.group];
  group.addEventListener('toggle', () => {
    openState[group.dataset.group] = group.open;
    try { localStorage.setItem(OPEN_KEY, JSON.stringify(openState)); } catch { /* storage unavailable */ }
  });
}

EFY.loadRaw().then(renderSettings);
renderRoom();
