const $ = (id) => document.getElementById(id);

// Access to Watch2Gether is optional: Chrome only asks for it when the W2G
// toggle is switched on, and it is handed back when the toggle is switched off.
const W2G_ORIGINS = [
  'https://api.w2g.tv/*',
  'https://w2g.tv/*',
  'https://www.youtube.com/oembed*',
];

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

async function renderRoom() {
  const { apiKey, streamkey } = await chrome.storage.local.get(['apiKey', 'streamkey']);
  $('room').textContent = streamkey ? `Active room: ${streamkey}` : 'No room configured.';
  $('room-input').value = streamkey || '';
  // The key is never shown back; blank means "keep the saved one".
  $('apiKey').placeholder = apiKey ? '•••••• saved (leave blank to keep)' : 'Paste your API key';
}

function renderToggles(settings) {
  for (const box of document.querySelectorAll('input[data-setting]')) {
    box.checked = !!settings[box.dataset.setting];
  }
  document.querySelector('[data-setting="allSubsInRow"]').disabled = !settings.tabs;
  $('w2g-config').hidden = !settings.w2g;
  $('w2g-hint').hidden = settings.w2g;
}

for (const box of document.querySelectorAll('input[data-setting]')) {
  box.addEventListener('change', async () => {
    const key = box.dataset.setting;
    if (key === 'w2g') {
      if (box.checked) {
        // Must be the first await in this handler to count as a user gesture.
        const granted = await chrome.permissions.request({ origins: W2G_ORIGINS });
        if (!granted) {
          box.checked = false;
          return say('Chrome did not grant access to w2g.tv, so the button stays off.', 'error');
        }
      } else {
        await chrome.permissions.remove({ origins: W2G_ORIGINS });
      }
    }
    renderToggles(await EFY.save({ [key]: box.checked }));
    say('');
  });
}

$('save').addEventListener('click', async () => {
  // Either field may be saved on its own; a blank field keeps what's already stored.
  const update = {};
  const key = $('apiKey').value.trim();
  if (key) update.apiKey = key;
  const roomText = $('room-input').value.trim();
  if (roomText) {
    const streamkey = parseStreamkey(roomText);
    if (!streamkey) return say('Enter a valid streamkey or room URL.', 'error');
    update.streamkey = streamkey;
  }
  if (!Object.keys(update).length) return say('Nothing to save.', 'error');
  await chrome.storage.local.set(update);
  $('apiKey').value = '';
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
  await chrome.storage.local.remove(['apiKey', 'streamkey']);
  $('apiKey').value = '';
  say('Saved key and room removed.', 'ok');
  renderRoom();
});

EFY.load().then(renderToggles);
renderRoom();
