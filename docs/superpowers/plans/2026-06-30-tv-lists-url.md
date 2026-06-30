# TV Lists, Favorites & Direct URL Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SQLite-backed custom lists (favorites), direct URL linking with channel ID + source context, and fix the frozen video bug on direct TV page load.

**Architecture:** `better-sqlite3` runs synchronously in Express — no ORM, plain SQL. The DB file lives in `downloads/db.sqlite` (already a Docker volume). TV.js reads `?id` and `?source` from the URL on mount, resolves the channel from the playlist, and updates the URL as the user navigates. The panel dropdown is a single searchable component that groups custom lists (top) and categories (below).

**Tech Stack:** better-sqlite3 (server), React + react-router-dom useSearchParams (client), styled-components (existing).

## Global Constraints

- Node 18, React 18, Express 4 — do not upgrade.
- `better-sqlite3` requires native compilation — Dockerfile must add `python3 make g++` on Alpine.
- DB file path: `downloads/db.sqlite` (relative to project root / `/app/downloads/db.sqlite` in Docker).
- All new API routes follow existing pattern: `app.get/post/delete('/api/...')` in `server.js`.
- All React changes are in `client/src/` — run `npm run build` from project root after each client task.
- No TypeScript. Plain JS only. No new dependencies on the client.
- `user_id` defaults to `'default'` everywhere — column exists for future multi-user support, never exposed in the UI yet.

---

### Task 1: SQLite setup + Lists API

**Files:**
- Create: `db.js` (project root, alongside `server.js`)
- Modify: `server.js` — add 6 routes + import db
- Modify: `Dockerfile` — add build tools for native module
- Modify: `package.json` — add better-sqlite3 dependency

**Interfaces:**
- Produces:
  - `GET /api/lists` → `[{ id, name, created_at }]`
  - `POST /api/lists` body `{ name }` → `{ id, name, created_at }`
  - `DELETE /api/lists/:id` → `{ success: true }`
  - `GET /api/lists/:id/items` → `[{ stream_url, name, stream_icon, category_name, added_at }]`
  - `POST /api/lists/:id/items` body `{ stream_url, name, stream_icon, category_name }` → `{ success: true }`
  - `DELETE /api/lists/:id/items/:encodedUrl` → `{ success: true }`

- [ ] **Step 1: Install better-sqlite3**

```bash
npm install better-sqlite3
```

Expected: `better-sqlite3` appears in `package.json` dependencies.

- [ ] **Step 2: Update Dockerfile to add build tools**

Replace the first two lines of the Dockerfile with:

```dockerfile
FROM node:18-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app
```

Full updated Dockerfile:
```dockerfile
FROM node:18-alpine

RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/

RUN npm install
RUN cd client && npm install

COPY . .

RUN cd client && npm run build

EXPOSE 5000

CMD ["npm", "start"]
```

- [ ] **Step 3: Create `db.js`**

```js
const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'downloads', 'db.sqlite');

let _db;

function getDb() {
  if (!_db) {
    _db = new Database(DB_PATH);
    _db.pragma('journal_mode = WAL');
    _db.pragma('foreign_keys = ON');
    _db.exec(`
      CREATE TABLE IF NOT EXISTS lists (
        id         INTEGER PRIMARY KEY AUTOINCREMENT,
        name       TEXT    NOT NULL,
        user_id    TEXT    NOT NULL DEFAULT 'default',
        created_at INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS list_items (
        list_id       INTEGER NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
        stream_url    TEXT    NOT NULL,
        name          TEXT,
        stream_icon   TEXT,
        category_name TEXT,
        added_at      INTEGER NOT NULL,
        PRIMARY KEY (list_id, stream_url)
      );
    `);
  }
  return _db;
}

function getLists(userId = 'default') {
  return getDb().prepare(
    'SELECT id, name, created_at FROM lists WHERE user_id = ? ORDER BY created_at ASC'
  ).all(userId);
}

function createList(name, userId = 'default') {
  const now = Date.now();
  const result = getDb().prepare(
    'INSERT INTO lists (name, user_id, created_at) VALUES (?, ?, ?)'
  ).run(name, userId, now);
  return { id: result.lastInsertRowid, name, created_at: now };
}

function deleteList(id) {
  getDb().prepare('DELETE FROM lists WHERE id = ?').run(id);
}

function getListItems(listId) {
  return getDb().prepare(
    'SELECT stream_url, name, stream_icon, category_name, added_at FROM list_items WHERE list_id = ? ORDER BY added_at ASC'
  ).all(listId);
}

function addListItem(listId, { stream_url, name, stream_icon, category_name }) {
  getDb().prepare(
    `INSERT OR REPLACE INTO list_items (list_id, stream_url, name, stream_icon, category_name, added_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(listId, stream_url, name || '', stream_icon || '', category_name || '', Date.now());
}

function removeListItem(listId, streamUrl) {
  getDb().prepare(
    'DELETE FROM list_items WHERE list_id = ? AND stream_url = ?'
  ).run(listId, streamUrl);
}

module.exports = { getLists, createList, deleteList, getListItems, addListItem, removeListItem };
```

- [ ] **Step 4: Add 6 API routes to `server.js`**

Add this block near the top of `server.js` (after the existing `require` statements):

```js
const db = require('./db');
```

Add these routes before the `// Serve React app for all other routes` line:

```js
// ── Lists API ────────────────────────────────────────────────────────────────

app.get('/api/lists', (req, res) => {
  try {
    res.json(db.getLists());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/lists', (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  try {
    res.json(db.createList(name.trim()));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/lists/:id', (req, res) => {
  try {
    db.deleteList(Number(req.params.id));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/lists/:id/items', (req, res) => {
  try {
    res.json(db.getListItems(Number(req.params.id)));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/lists/:id/items', (req, res) => {
  const { stream_url, name, stream_icon, category_name } = req.body;
  if (!stream_url) return res.status(400).json({ error: 'stream_url required' });
  try {
    db.addListItem(Number(req.params.id), { stream_url, name, stream_icon, category_name });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.delete('/api/lists/:id/items/:encodedUrl', (req, res) => {
  try {
    db.removeListItem(Number(req.params.id), decodeURIComponent(req.params.encodedUrl));
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
```

- [ ] **Step 5: Test API locally**

Start the server: `npm run dev`

```bash
# Create a list
curl -s -X POST http://localhost:5088/api/lists \
  -H "Content-Type: application/json" \
  -d '{"name":"Mes favoris"}' | python3 -m json.tool

# Expected: {"id": 1, "name": "Mes favoris", "created_at": <timestamp>}

# List all lists
curl -s http://localhost:5088/api/lists | python3 -m json.tool
# Expected: [{"id": 1, "name": "Mes favoris", "created_at": ...}]

# Add an item
curl -s -X POST http://localhost:5088/api/lists/1/items \
  -H "Content-Type: application/json" \
  -d '{"stream_url":"http://cf.2connectcdn.live/live/user/pass/412899","name":"CA FR: RDS HD","stream_icon":"","category_name":"CA FR"}' | python3 -m json.tool
# Expected: {"success": true}

# Get items
curl -s http://localhost:5088/api/lists/1/items | python3 -m json.tool
# Expected: [{"stream_url": "...", "name": "CA FR: RDS HD", ...}]

# Delete item
curl -s -X DELETE "http://localhost:5088/api/lists/1/items/$(python3 -c "import urllib.parse; print(urllib.parse.quote('http://cf.2connectcdn.live/live/user/pass/412899', safe=''))")" | python3 -m json.tool
# Expected: {"success": true}
```

- [ ] **Step 6: Commit**

```bash
git add db.js server.js package.json package-lock.json Dockerfile
git commit -m "feat: add SQLite lists API with better-sqlite3"
```

---

### Task 2: Fix TV.js — direct URL load + URL params

**Files:**
- Modify: `client/src/pages/TV.js`

**Interfaces:**
- Consumes: `GET /api/playlist` (existing), `GET /api/lists` (Task 1), `GET /api/lists/:id/items` (Task 1)
- Produces:
  - URL shape: `/tv?id=STREAM_ID&source=list:1` or `&source=cat:CA+FR` or no source param
  - `channels` state is the full playlist always; `displayChannels` is the filtered view
  - `currentIndex` resolves against `channels` (full list), not `displayChannels`

**Bug being fixed:** `useEffect([currentIndex, channels.length])` fires when `channels` is populated but `currentIndex` is already 0 — if the channel at index 0 is not the one from `?id=`, the wrong channel loads. Fix: resolve `?id=` after channels load, then trigger load.

- [ ] **Step 1: Add URL param reading and source state at component top**

Replace the existing state initialization block (lines starting at `const [channels, setChannels]`) with:

```js
const navigate = useNavigate();
const { state } = useLocation();
const [searchParams, setSearchParams] = useSearchParams();

// All channels — always the full playlist
const [channels, setChannels] = useState([]);
// Channels shown in the panel — filtered by source
const [displayChannels, setDisplayChannels] = useState([]);
// source: null | { type: 'list', id: number } | { type: 'cat', name: string }
const [source, setSource] = useState(() => {
  const s = searchParams.get('source');
  if (!s) return null;
  if (s.startsWith('list:')) return { type: 'list', id: Number(s.slice(5)) };
  if (s.startsWith('cat:')) return { type: 'cat', name: s.slice(4) };
  return null;
});
const [currentIndex, setCurrentIndex] = useState(0);
const [lists, setLists] = useState([]);
```

Add `useSearchParams` to the react-router-dom import at top of file:
```js
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
```

- [ ] **Step 2: Replace channel loading useEffect**

Remove the existing two `useEffect` blocks that handle channel fetching and `loadChannel`, and replace them with:

```js
// 1. Load full playlist on mount
useEffect(() => {
  const fromState = state?.channels;
  if (fromState?.length) {
    setChannels(fromState);
  } else {
    axios.get('/api/playlist').then(r => setChannels(r.data)).catch(() => {});
  }
  // Load lists for panel dropdown
  axios.get('/api/lists').then(r => setLists(r.data)).catch(() => {});
}, []);

// 2. Once channels are loaded, resolve ?id param and set currentIndex
useEffect(() => {
  if (!channels.length) return;
  const idParam = searchParams.get('id');
  if (idParam) {
    const idx = channels.findIndex(c => c.stream_url.includes(`/${idParam}`));
    if (idx >= 0) setCurrentIndex(idx);
  } else if (state?.channel) {
    const idx = channels.findIndex(c => c === state.channel);
    if (idx >= 0) setCurrentIndex(idx);
  }
}, [channels]);

// 3. Apply source filter to build displayChannels
useEffect(() => {
  if (!channels.length) { setDisplayChannels([]); return; }
  if (!source) { setDisplayChannels(channels); return; }
  if (source.type === 'cat') {
    setDisplayChannels(channels.filter(c => c.category_name === source.name));
    return;
  }
  if (source.type === 'list') {
    axios.get(`/api/lists/${source.id}/items`).then(r => {
      const urls = new Set(r.data.map(i => i.stream_url));
      setDisplayChannels(channels.filter(c => urls.has(c.stream_url)));
    }).catch(() => setDisplayChannels([]));
    return;
  }
  setDisplayChannels(channels);
}, [channels, source]);

// 4. Load channel when currentIndex resolves (only once channels are ready)
const prevIndexRef = useRef(null);
useEffect(() => {
  if (!channels.length) return;
  if (prevIndexRef.current === currentIndex) return;
  prevIndexRef.current = currentIndex;
  if (channels[currentIndex]) loadChannel(channels[currentIndex]);
  return () => { if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; } };
}, [currentIndex, channels]);
```

- [ ] **Step 3: Update URL when channel or source changes**

Add this effect after the ones above:

```js
// Sync URL params to current state
useEffect(() => {
  if (!channels.length) return;
  const ch = channels[currentIndex];
  if (!ch) return;
  const idMatch = ch.stream_url.match(/\/(\d+)(?:\.\w+)?$/);
  const id = idMatch ? idMatch[1] : null;
  setSearchParams(prev => {
    const next = new URLSearchParams(prev);
    if (id) next.set('id', id); else next.delete('id');
    if (source?.type === 'list') next.set('source', `list:${source.id}`);
    else if (source?.type === 'cat') next.set('source', `cat:${source.name}`);
    else next.delete('source');
    return next;
  }, { replace: true });
}, [currentIndex, source, channels]);
```

- [ ] **Step 4: Update zapTo to work against `channels` (full list)**

`zapTo` should always work against the full `channels` array (not `displayChannels`) so channel numbers stay stable. The existing `zapTo` already uses `channels` — verify it's unchanged:

```js
const zapTo = useCallback((idx) => {
  if (!channels.length) return;
  const clamped = Math.max(0, Math.min(idx, channels.length - 1));
  if (clamped === currentIndex) return;
  setCurrentIndex(clamped);
  const ch = channels[clamped];
  clearTimeout(toastTimer.current);
  setToast({ name: ch.name, icon: ch.stream_icon, num: clamped + 1 });
  toastTimer.current = setTimeout(() => setToast(null), 2500);
  setTimeout(() => {
    const active = channelListRef.current?.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, 50);
}, [channels, currentIndex]);
```

- [ ] **Step 5: Update panel to render `displayChannels` instead of `channels`**

Find the `ChannelList` render section and replace `channels.map(...)` with `displayChannels.map(...)`. The `realIdx` lookup must still use `channels.indexOf(ch)` so the channel number and zapTo index are correct:

```jsx
<ChannelList ref={channelListRef}>
  {(panelSearch
    ? displayChannels.filter(c => c.name?.toLowerCase().includes(panelSearch.toLowerCase()))
    : displayChannels
  ).map((ch) => {
    const realIdx = channels.indexOf(ch);
    const isActive = realIdx === currentIndex;
    return (
      <ChannelItem
        key={ch.stream_url}
        active={isActive}
        data-active={isActive}
        onClick={() => { zapTo(realIdx); setShowPanel(false); revealOverlay(); }}
      >
        {ch.stream_icon
          ? <ItemLogo src={ch.stream_icon} alt="" onError={e => e.target.style.display='none'} />
          : <ItemLogoPlaceholder>📺</ItemLogoPlaceholder>
        }
        <ItemInfo>
          <ItemName>{ch.name}</ItemName>
          <ItemCat>{ch.category_name}</ItemCat>
        </ItemInfo>
        <ItemNum>{realIdx + 1}</ItemNum>
      </ChannelItem>
    );
  })}
</ChannelList>
```

- [ ] **Step 6: Build and smoke-test**

```bash
npm run build
```

Open `http://localhost:5088/tv` — should load and play channel 1.
Open `http://localhost:5088/tv?id=412899` — should play RDS HD directly.
Check URL updates to `/tv?id=412899` as you zap.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/TV.js client/build/
git commit -m "fix: TV direct URL load, URL params for id+source, displayChannels filter"
```

---

### Task 3: Panel source dropdown (lists + categories)

**Files:**
- Modify: `client/src/pages/TV.js` — add source dropdown in panel header

**Interfaces:**
- Consumes: `lists` state (from Task 2), `channels` state, `source` state + setter, `GET /api/lists` (already fetched in Task 2)
- Produces: `source` state updates, panel re-filters via Task 2's useEffect

- [ ] **Step 1: Add styled components for the dropdown**

Add these styled components near the panel styled components section in `TV.js`:

```js
const SourceDropWrap = styled.div`
  position: relative;
  margin: 0 0.75rem 0.5rem;
  flex-shrink: 0;
`;

const SourceTrigger = styled.button`
  width: 100%;
  padding: 0.45rem 2rem 0.45rem 0.75rem;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 8px;
  color: white;
  font-size: 0.85rem;
  text-align: left;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  &::after { content: '▾'; position: absolute; right: 0.6rem; top: 50%; transform: translateY(-50%); }
  &:hover { background: rgba(255,255,255,0.14); }
`;

const SourceMenu = styled.div`
  position: absolute;
  top: calc(100% + 4px);
  left: 0; right: 0;
  background: rgba(15,15,20,0.98);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  max-height: 280px;
`;

const SourceSearch = styled.input`
  padding: 0.45rem 0.75rem;
  background: transparent;
  border: none;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  color: white;
  font-size: 0.85rem;
  outline: none;
  &::placeholder { color: rgba(255,255,255,0.35); }
`;

const SourceList = styled.div`
  overflow-y: auto;
  flex: 1;
  &::-webkit-scrollbar { width: 3px; }
  &::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); }
`;

const SourceGroupLabel = styled.div`
  padding: 0.3rem 0.75rem;
  font-size: 0.7rem;
  color: rgba(255,255,255,0.35);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const SourceItem = styled.div`
  padding: 0.45rem 0.75rem;
  font-size: 0.85rem;
  color: ${p => p.active ? '#667eea' : 'white'};
  font-weight: ${p => p.active ? 600 : 400};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  &:hover { background: rgba(255,255,255,0.07); }
`;
```

- [ ] **Step 2: Add SourceDropdown component inside TV.js (before the TV function)**

```js
function SourceDropdown({ source, setSource, lists, channels }) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const ref = React.useRef(null);

  React.useEffect(() => {
    const onOut = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, []);

  const categories = React.useMemo(() =>
    [...new Set(channels.map(c => c.category_name).filter(Boolean))].sort(),
    [channels]
  );

  const label = !source ? 'Toutes les chaînes'
    : source.type === 'list' ? (lists.find(l => l.id === source.id)?.name || 'Liste')
    : source.name;

  const filteredLists = lists.filter(l => !search || l.name.toLowerCase().includes(search.toLowerCase()));
  const filteredCats = categories.filter(c => !search || c.toLowerCase().includes(search.toLowerCase()));

  const select = (s) => { setSource(s); setOpen(false); setSearch(''); };

  return (
    <SourceDropWrap ref={ref}>
      <SourceTrigger onClick={() => { setOpen(o => !o); setSearch(''); }}>
        {label}
      </SourceTrigger>
      {open && (
        <SourceMenu>
          <SourceSearch
            autoFocus
            placeholder="Rechercher..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <SourceList>
            <SourceItem active={!source} onClick={() => select(null)}>Toutes les chaînes</SourceItem>
            {filteredLists.length > 0 && (
              <>
                <SourceGroupLabel>Mes listes</SourceGroupLabel>
                {filteredLists.map(l => (
                  <SourceItem
                    key={l.id}
                    active={source?.type === 'list' && source.id === l.id}
                    onClick={() => select({ type: 'list', id: l.id })}
                  >
                    ⭐ {l.name}
                  </SourceItem>
                ))}
              </>
            )}
            {filteredCats.length > 0 && (
              <>
                <SourceGroupLabel>Catégories</SourceGroupLabel>
                {filteredCats.map(c => (
                  <SourceItem
                    key={c}
                    active={source?.type === 'cat' && source.name === c}
                    onClick={() => select({ type: 'cat', name: c })}
                  >
                    {c}
                  </SourceItem>
                ))}
              </>
            )}
          </SourceList>
        </SourceMenu>
      )}
    </SourceDropWrap>
  );
}
```

- [ ] **Step 3: Insert dropdown into panel JSX**

In the `Panel` JSX, add `<SourceDropdown>` between `<PanelSearch>` (the channel search) and `<ChannelList>`:

```jsx
<Panel>
  <PanelHead>
    <span>Channels ({displayChannels.length})</span>
    <IconBtn onClick={() => setShowPanel(false)}>✕</IconBtn>
  </PanelHead>
  <SourceDropdown
    source={source}
    setSource={setSource}
    lists={lists}
    channels={channels}
  />
  <PanelSearch
    autoFocus
    placeholder="Search channels..."
    value={panelSearch}
    onChange={e => setPanelSearch(e.target.value)}
  />
  <ChannelList ref={channelListRef}>
    {/* ... existing channel items ... */}
  </ChannelList>
</Panel>
```

- [ ] **Step 4: Build and test**

```bash
npm run build
```

Open `/tv`, open the panel, verify dropdown shows "Toutes les chaînes" at top. Create a list via `curl -X POST http://localhost:5088/api/lists -H "Content-Type: application/json" -d '{"name":"Test"}'`, refresh, verify list appears under "Mes listes" in dropdown. Select a category, verify channels filter. URL should update to `?source=cat:CA+FR`.

- [ ] **Step 5: Commit**

```bash
git add client/src/pages/TV.js client/build/
git commit -m "feat: panel source dropdown — lists + categories searchable"
```

---

### Task 4: Favorites UI — star button + add-to-list popover

**Files:**
- Modify: `client/src/pages/TV.js` — star button in panel + top bar, popover to add/remove from lists

**Interfaces:**
- Consumes: `lists` state, `GET /api/lists/:id/items`, `POST /api/lists/:id/items`, `DELETE /api/lists/:id/items/:encodedUrl`
- Produces: `itemsByList` state — `Map<listId, Set<stream_url>>` for O(1) membership check

- [ ] **Step 1: Add itemsByList state and fetch on lists change**

Inside the `TV` component, add:

```js
// Map<listId, Set<stream_url>> — for O(1) membership check
const [itemsByList, setItemsByList] = useState(new Map());

const refreshListItems = useCallback(async () => {
  if (!lists.length) return;
  const entries = await Promise.all(
    lists.map(l =>
      axios.get(`/api/lists/${l.id}/items`)
        .then(r => [l.id, new Set(r.data.map(i => i.stream_url))])
        .catch(() => [l.id, new Set()])
    )
  );
  setItemsByList(new Map(entries));
}, [lists]);

useEffect(() => { refreshListItems(); }, [lists]);
```

- [ ] **Step 2: Add styled components for the popover**

```js
const StarBtn = styled.button`
  background: none;
  border: none;
  color: ${p => p.active ? '#f5c518' : 'rgba(255,255,255,0.35)'};
  font-size: 1rem;
  cursor: pointer;
  padding: 0.1rem 0.3rem;
  flex-shrink: 0;
  line-height: 1;
  &:hover { color: #f5c518; }
`;

const Popover = styled.div`
  position: fixed;
  background: rgba(15,15,20,0.98);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 10px;
  padding: 0.5rem 0;
  z-index: 100;
  min-width: 180px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.5);
`;

const PopoverItem = styled.div`
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  &:hover { background: rgba(255,255,255,0.08); }
`;

const PopoverDivider = styled.div`
  height: 1px;
  background: rgba(255,255,255,0.1);
  margin: 0.25rem 0;
`;

const NewListInput = styled.input`
  margin: 0.25rem 0.75rem;
  padding: 0.35rem 0.5rem;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  border-radius: 6px;
  color: white;
  font-size: 0.8rem;
  outline: none;
  width: calc(100% - 1.5rem);
  &::placeholder { color: rgba(255,255,255,0.35); }
`;
```

- [ ] **Step 3: Add FavPopover component inside TV.js (before TV function)**

```js
function FavPopover({ channel, lists, itemsByList, anchorPos, onClose, onRefresh }) {
  const ref = React.useRef(null);
  const [newListName, setNewListName] = React.useState('');
  const [creating, setCreating] = React.useState(false);

  React.useEffect(() => {
    const onOut = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, [onClose]);

  const toggle = async (listId) => {
    const inList = itemsByList.get(listId)?.has(channel.stream_url);
    if (inList) {
      await axios.delete(`/api/lists/${listId}/items/${encodeURIComponent(channel.stream_url)}`);
    } else {
      await axios.post(`/api/lists/${listId}/items`, {
        stream_url: channel.stream_url,
        name: channel.name,
        stream_icon: channel.stream_icon,
        category_name: channel.category_name,
      });
    }
    onRefresh();
  };

  const createAndAdd = async () => {
    if (!newListName.trim()) return;
    const res = await axios.post('/api/lists', { name: newListName.trim() });
    await axios.post(`/api/lists/${res.data.id}/items`, {
      stream_url: channel.stream_url,
      name: channel.name,
      stream_icon: channel.stream_icon,
      category_name: channel.category_name,
    });
    setNewListName('');
    setCreating(false);
    onRefresh();
    // Refresh lists state in parent — done via onRefresh which calls refreshListItems
  };

  const inAnyList = lists.some(l => itemsByList.get(l.id)?.has(channel.stream_url));

  return (
    <Popover ref={ref} style={{ top: anchorPos.y, left: anchorPos.x }}>
      <PopoverItem style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', cursor: 'default' }}>
        {channel.name}
      </PopoverItem>
      <PopoverDivider />
      {lists.map(l => {
        const inList = itemsByList.get(l.id)?.has(channel.stream_url);
        return (
          <PopoverItem key={l.id} onClick={() => toggle(l.id)}>
            <span>{inList ? '✓' : '+'}</span>
            {l.name}
          </PopoverItem>
        );
      })}
      <PopoverDivider />
      {creating ? (
        <NewListInput
          autoFocus
          placeholder="Nom de la liste..."
          value={newListName}
          onChange={e => setNewListName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') createAndAdd(); if (e.key === 'Escape') setCreating(false); }}
        />
      ) : (
        <PopoverItem onClick={() => setCreating(true)}>
          <span>+</span> Nouvelle liste
        </PopoverItem>
      )}
    </Popover>
  );
}
```

- [ ] **Step 4: Add popover state + star button in panel channel items**

Add state to TV component:

```js
const [favPopover, setFavPopover] = useState(null); // { channel, x, y }
```

Update `refreshListItems` to also refresh lists (so new lists appear in dropdown after creation):

```js
const refreshListItems = useCallback(async () => {
  const [listsRes, ...itemResults] = await Promise.all([
    axios.get('/api/lists'),
    // fetched per-list below after we have the list
  ]);
  setLists(listsRes.data);
  const entries = await Promise.all(
    listsRes.data.map(l =>
      axios.get(`/api/lists/${l.id}/items`)
        .then(r => [l.id, new Set(r.data.map(i => i.stream_url))])
        .catch(() => [l.id, new Set()])
    )
  );
  setItemsByList(new Map(entries));
}, []);
```

Update the channel list render to add a star button on each item:

```jsx
<ChannelItem
  key={ch.stream_url}
  active={isActive}
  data-active={isActive}
  onClick={() => { zapTo(realIdx); setShowPanel(false); revealOverlay(); }}
>
  {ch.stream_icon
    ? <ItemLogo src={ch.stream_icon} alt="" onError={e => e.target.style.display='none'} />
    : <ItemLogoPlaceholder>📺</ItemLogoPlaceholder>
  }
  <ItemInfo>
    <ItemName>{ch.name}</ItemName>
    <ItemCat>{ch.category_name}</ItemCat>
  </ItemInfo>
  <StarBtn
    active={lists.some(l => itemsByList.get(l.id)?.has(ch.stream_url))}
    onClick={(e) => {
      e.stopPropagation();
      const rect = e.currentTarget.getBoundingClientRect();
      setFavPopover({ channel: ch, x: rect.left - 190, y: rect.top });
    }}
  >⭐</StarBtn>
  <ItemNum>{realIdx + 1}</ItemNum>
</ChannelItem>
```

- [ ] **Step 5: Add star button to TopBar + render popover**

In the TopBar, after `<ChannelNameText>`, add:

```jsx
<StarBtn
  active={currentChannel && lists.some(l => itemsByList.get(l.id)?.has(currentChannel.stream_url))}
  onClick={(e) => {
    if (!currentChannel) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setFavPopover({ channel: currentChannel, x: rect.left - 190, y: rect.bottom + 4 });
  }}
>⭐</StarBtn>
```

At the end of the `TVWrap` JSX (before closing tag), add:

```jsx
{favPopover && (
  <FavPopover
    channel={favPopover.channel}
    lists={lists}
    itemsByList={itemsByList}
    anchorPos={{ x: favPopover.x, y: favPopover.y }}
    onClose={() => setFavPopover(null)}
    onRefresh={() => { refreshListItems(); setFavPopover(null); }}
  />
)}
```

- [ ] **Step 6: Build and test**

```bash
npm run build
```

1. Open `/tv`, open panel, click ⭐ on a channel — popover should appear with "Nouvelle liste".
2. Type a name, press Enter — list is created and channel added, ⭐ turns yellow.
3. Select that list in the source dropdown — only that channel appears.
4. Copy the URL (e.g. `/tv?id=412899&source=list:1`) — paste in new tab — same channel plays, same list shown.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/TV.js client/build/
git commit -m "feat: favorites star button, add-to-list popover, new list creation from TV"
```

---

### Task 5: Deploy to remote server

**Files:**
- No new files — push existing commits then rebuild Docker.

- [ ] **Step 1: Push to GitHub**

```bash
git push origin main
```

- [ ] **Step 2: Pull and rebuild on server**

```bash
sshpass -p 'Takayanagi88;' ssh -o StrictHostKeyChecking=no guillaume@192.168.0.21 \
  'cd /home/guillaume/xtream_server_explorer && git pull https://github.com/faahren/xtream_server_explorer.git main && docker compose build --no-cache 2>&1 | tail -8 && docker compose up -d'
```

Expected: container recreated, `Server running on port 5000` in logs.

- [ ] **Step 3: Verify on remote**

```bash
sshpass -p 'Takayanagi88;' ssh -o StrictHostKeyChecking=no guillaume@192.168.0.21 \
  'curl -s http://localhost:5000/api/lists | python3 -m json.tool'
```

Expected: `[]` (empty list, DB initialized correctly).

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A && git commit -m "fix: post-deploy corrections" && git push origin main
```
