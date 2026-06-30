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
