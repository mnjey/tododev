// SQLite 数据层（better-sqlite3，同步 API）
const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(path.join(DATA_DIR, 'bookmarks.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS bookmarks (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    url        TEXT NOT NULL,
    title      TEXT,
    source     TEXT NOT NULL DEFAULT 'manual',
    is_read    INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    read_at    TEXT
  );
  CREATE INDEX IF NOT EXISTS idx_bookmarks_created ON bookmarks(created_at DESC);
`);

const stmts = {
  getAll: db.prepare('SELECT * FROM bookmarks ORDER BY created_at DESC, id DESC'),
  getAllUnread: db.prepare('SELECT * FROM bookmarks WHERE is_read = 0 ORDER BY created_at DESC, id DESC'),
  getAllRead: db.prepare('SELECT * FROM bookmarks WHERE is_read = 1 ORDER BY read_at DESC, id DESC'),
  get: db.prepare('SELECT * FROM bookmarks WHERE id = ?'),
  insert: db.prepare(`
    INSERT INTO bookmarks (url, title, source) VALUES (?, ?, ?)
  `),
  setRead: db.prepare(`
    UPDATE bookmarks
       SET is_read = ?, read_at = CASE WHEN ? = 1 THEN datetime('now', 'localtime') ELSE NULL END
     WHERE id = ?
  `),
  remove: db.prepare('DELETE FROM bookmarks WHERE id = ?'),
  counts: db.prepare(`
    SELECT
      COUNT(*) AS all_count,
      SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) AS unread_count,
      SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) AS read_count
    FROM bookmarks
  `),
};

function rowToBookmark(row) {
  return { ...row, is_read: !!row.is_read };
}

function getAll(filter) {
  const rows = filter === 'read'
    ? stmts.getAllRead.all()
    : filter === 'unread'
      ? stmts.getAllUnread.all()
      : stmts.getAll.all();
  return rows.map(rowToBookmark);
}

function get(id) {
  const row = stmts.get.get(id);
  return row ? rowToBookmark(row) : null;
}

function create({ url, title, source = 'manual' }) {
  const info = stmts.insert.run(url, title || null, source);
  return get(info.lastInsertRowid);
}

function setRead(id, isRead) {
  const info = stmts.setRead.run(isRead ? 1 : 0, isRead ? 1 : 0, id);
  return info.changes > 0;
}

function remove(id) {
  const info = stmts.remove.run(id);
  return info.changes > 0;
}

function counts() {
  const row = stmts.counts.get();
  return {
    all: row.all_count,
    unread: row.unread_count || 0,
    read: row.read_count || 0,
  };
}

module.exports = { getAll, get, create, setRead, remove, counts };
