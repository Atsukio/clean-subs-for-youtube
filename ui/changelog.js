// User-facing changes per release, newest first, shown once in the popup after an update ("What's new").
// Add an entry in the release commit for every version users should hear about; plain sentences, no internals.
globalThis.EFY_CHANGELOG = [
  {
    version: '1.4.0',
    items: [
      'After an update, this popup now shows what changed (like this note) and the toolbar icon is marked NEW until you click "Got it".',
    ],
  },
  {
    version: '1.3.0',
    items: [
      'Watch2Gether: choose which tab (Chat, Playlist or History) a room opens on.',
      'Watch2Gether: joining a room where nobody else is online no longer starts the video by itself. It is on by default and can be switched off under "In a room".',
      'If adding a video fails, a notification on the page now says why.',
      'Tidier Watch2Gether settings, and dropdowns that are readable in dark mode.',
      'If you already use Watch2Gether, click "Grant access" in its settings once so the room options can work.',
    ],
  },
  {
    version: '1.2.1',
    items: [
      'The two Watch2Gether buttons (on thumbnails and next to Like and Dislike) each have their own switch.',
      'Fixed an error when switching Watch2Gether off.',
    ],
  },
];
