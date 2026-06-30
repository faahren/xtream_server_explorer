# Playlist Manager Redesign — Design Spec

## Goal

Transform the Playlist page from a simple paginated channel table into a proper IPTV manager: channel browser on the left with list-add support, list manager panel on the right.

## Layout

**Desktop (≥ 768px):** Two-column split — 70% channel browser, 30% lists panel, side by side, full page height.

**Mobile (< 768px):** Single column. Lists panel hidden. List management accessible via the `+` popover on each channel row only.

## Left Panel — Channel Browser (70%)

### Header (unchanged)
- Page title "Playlist"
- Search input (debounced, synced to URL `?q=`)
- Category dropdown (searchable, synced to URL `?cat=`)
- Refresh button

### Channel Table (unchanged except action column)
- Columns: Logo · Name · Category · Stream URL (desktop only) · **Actions**
- **Actions column:** two buttons per row — `+` (add to list) and `▶ Watch`
- `+` opens `FavPopover` (existing component from TV.js) positioned relative to the button
- `▶ Watch` navigates to `/tv` with the full filtered channel list and this channel as starting point (existing behavior)

### Pagination (unchanged)
- 50 channels per page, URL param `?page=`

## Right Panel — Mes listes (30%)

### Header
- Title "Mes listes"
- Button "+ Nouvelle liste" — inline creation (see below)

### List items (accordion)
Each list rendered as a collapsible row:

**Collapsed state:**
- List name
- Badge: "N chaînes"
- `▶` button — navigates to `/tv?source=list:ID` with all channels as context
- Chevron `▶` / `▼` to expand

**Expanded state:**
- Compact channel rows: logo (24px) · name · `×` remove button
- Remove calls `DELETE /api/lists/:id/items/:encodedUrl`, refreshes list

### Create new list
- Click "+ Nouvelle liste" → text input appears inline at the top of the lists panel
- Enter → `POST /api/lists { name }` → list added, input dismissed
- Escape → cancelled without creating

### Empty state
- "Aucune liste. Créez-en une avec le bouton ci-dessus."

## Data Flow

- On mount: `GET /api/lists` + `GET /api/lists/:id/items` for all lists (same `refreshListItems` pattern as TV.js)
- `FavPopover` reused from TV.js — moved to a shared component file `client/src/components/FavPopover.js`
- After any add/remove/create: call `refreshListItems()` to refresh right panel

## Shared Component: FavPopover

Currently defined inline in `TV.js`. Move to `client/src/components/FavPopover.js` and import in both `TV.js` and `Playlist.js`.

Props (unchanged): `channel`, `lists`, `itemsByList`, `anchorPos`, `onClose`, `onRefresh`

## API (no new endpoints)

All existing:
- `GET /api/lists` — fetch all lists
- `POST /api/lists` — create list
- `GET /api/lists/:id/items` — channels in list
- `POST /api/lists/:id/items` — add channel
- `DELETE /api/lists/:id/items/:encodedUrl` — remove channel

## Styling

- Right panel: white background, `box-shadow` left border, fixed height = viewport - navbar (use `calc(100vh - 60px)`), `overflow-y: auto`
- List items: same styled-components conventions as rest of app (no new design tokens)
- On mobile: right panel `display: none`

## Out of scope

- Drag-and-drop channel reordering within a list
- List renaming / deletion from this page (can be added later)
- Multi-select channel bulk-add
