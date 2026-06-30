const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = path.join(__dirname, 'downloads', 'db.sqlite');

let _db;

function getDb() {
  if (!_db) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
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
      CREATE TABLE IF NOT EXISTS recently_viewed (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        type      TEXT    NOT NULL,
        item_id   TEXT    NOT NULL,
        name      TEXT    NOT NULL,
        cover     TEXT,
        viewed_at INTEGER NOT NULL,
        UNIQUE(type, item_id)
      );
      CREATE TABLE IF NOT EXISTS channel_history (
        stream_url    TEXT    PRIMARY KEY,
        name          TEXT,
        stream_icon   TEXT,
        category_name TEXT,
        last_watched  INTEGER NOT NULL,
        watch_count   INTEGER NOT NULL DEFAULT 1
      );
    `);
  }
  return _db;
}

// System lists (virtual, always prepended)
const SYSTEM_LISTS = [
  { id: -1, name: 'Récemment regardés', system: true, created_at: 0 },
  { id: -2, name: 'Les plus regardés',  system: true, created_at: 0 },
];

function getLists(userId = 'default') {
  const userLists = getDb().prepare(
    'SELECT id, name, created_at FROM lists WHERE user_id = ? ORDER BY created_at ASC'
  ).all(userId);
  return [...SYSTEM_LISTS, ...userLists];
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
  if (listId === -1) {
    return getDb().prepare(
      'SELECT stream_url, name, stream_icon, category_name, last_watched AS added_at FROM channel_history ORDER BY last_watched DESC LIMIT 20'
    ).all();
  }
  if (listId === -2) {
    return getDb().prepare(
      'SELECT stream_url, name, stream_icon, category_name, last_watched AS added_at FROM channel_history ORDER BY watch_count DESC LIMIT 20'
    ).all();
  }
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

// Recently viewed (series + movies)
function recordRecentlyViewed({ type, item_id, name, cover }) {
  const now = Date.now();
  getDb().prepare(
    `INSERT INTO recently_viewed (type, item_id, name, cover, viewed_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(type, item_id) DO UPDATE SET name=excluded.name, cover=excluded.cover, viewed_at=excluded.viewed_at`
  ).run(type, String(item_id), name || '', cover || '', now);
}

function getRecentlyViewed(limit = 20) {
  return getDb().prepare(
    'SELECT type, item_id, name, cover, viewed_at FROM recently_viewed ORDER BY viewed_at DESC LIMIT ?'
  ).all(limit);
}

// Channel history
function recordChannelWatch({ stream_url, name, stream_icon, category_name }) {
  const now = Date.now();
  getDb().prepare(
    `INSERT INTO channel_history (stream_url, name, stream_icon, category_name, last_watched, watch_count)
     VALUES (?, ?, ?, ?, ?, 1)
     ON CONFLICT(stream_url) DO UPDATE SET
       name=excluded.name,
       stream_icon=excluded.stream_icon,
       category_name=excluded.category_name,
       last_watched=excluded.last_watched,
       watch_count=watch_count + 1`
  ).run(stream_url, name || '', stream_icon || '', category_name || '', now);
}

module.exports = {
  getLists, createList, deleteList, getListItems, addListItem, removeListItem,
  recordRecentlyViewed, getRecentlyViewed, recordChannelWatch,
};
