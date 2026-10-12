import { canonicalId, canonicalUrl } from '../lib/ids.js';

const API = 'https://api.w2g.tv';

const getSettings = async () => (await chrome.storage.local.get(['apiKey', 'streamkey']));

async function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(timer);
  }
}

// Fallback when the page gave us no title (YouTube's markup varies by renderer).
async function oembedTitle(id) {
  try {
    const res = await fetchWithTimeout(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(canonicalUrl(id))}`);
    return res.ok ? (await res.json()).title : '';
  } catch {
    return '';
  }
}

async function addVideo({ url, title }) {
  const { apiKey, streamkey } = await getSettings();
  if (!apiKey || !streamkey) {
    return { status: 'error', message: 'Set API key and room in the extension popup.' };
  }
  const id = canonicalId(url);
  if (!id) return { status: 'error', message: 'Could not identify the video.' };

  title = title?.trim() || (await oembedTitle(id));
  console.log('[Clean Subs] adding', id, 'with title:', title || '(none)');
  try {
    const res = await fetchWithTimeout(`${API}/rooms/${streamkey}/playlists/current/playlist_items/sync_update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        w2g_api_key: apiKey,
        // `thumb` isn't in the official docs; a forum example uses it, so it's sent best-effort.
        add_items: [{ url: canonicalUrl(id), ...(title && { title }), thumb: `https://i.ytimg.com/vi/${id.slice(3)}/hqdefault.jpg` }],
      }),
    });
    if (!res.ok) {
      const hint = res.status === 401 || res.status === 403 ? 'Check API key and room membership.'
        : res.status === 404 ? 'Room not found (is this the streamkey?).' : '';
      const body = (await res.text().catch(() => '')).replace(/\s+/g, ' ').slice(0, 150);
      console.warn('[Clean Subs] add failed:', res.status, body);
      return { status: 'error', message: `W2G returned ${res.status}. ${hint} ${body}`.trim() };
    }
  } catch (err) {
    console.warn('[Clean Subs] add failed:', err.name);
    return { status: 'error', message: `Network error reaching W2G (${err.name}).` };
  }
  return { status: 'added' };
}

async function testConnection() {
  const { apiKey, streamkey } = await getSettings();
  if (!apiKey || !streamkey) return { ok: false, message: 'Save an API key and room first.' };
  try {
    const res = await fetchWithTimeout(`https://w2g.tv/rooms/${streamkey}`);
    if (!res.ok) return { ok: false, message: `Room page returned ${res.status}. Check the streamkey.` };
  } catch {
    return { ok: false, message: 'Could not reach w2g.tv.' };
  }
  return { ok: true, message: 'Room page reachable. The API key can only be verified by adding a video.' };
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  const job = msg.type === 'add' ? addVideo(msg)
    : msg.type === 'test' ? testConnection()
    : null;
  if (!job) return false;
  job.then(sendResponse, () => sendResponse({ status: 'error', ok: false, message: 'Unexpected error.' }));
  return true; // async response
});

// Keep the W2G toggle in step with the optional host permission. The popup can
// close while Chrome shows the permission prompt, and permissions can also be
// revoked from chrome://extensions, so the permission is the source of truth.
async function setW2gSetting(on) {
  const key = 'settings';
  const current = (await chrome.storage.sync.get(key))[key] || {};
  await chrome.storage.sync.set({ [key]: { ...current, w2g: on } });
}
const isW2g = (perms) => perms.origins?.some((o) => o.includes('api.w2g.tv'));
chrome.permissions.onAdded.addListener((perms) => { if (isW2g(perms)) setW2gSetting(true); });
chrome.permissions.onRemoved.addListener((perms) => { if (isW2g(perms)) setW2gSetting(false); });
