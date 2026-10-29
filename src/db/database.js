import * as SQLite from 'expo-sqlite';

let dbPromise = null;

/** Opens (once) and migrates the database. */
export function getDb() {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync('smart_capture.db');
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        PRAGMA foreign_keys = ON;

        CREATE TABLE IF NOT EXISTS records (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          notes TEXT NOT NULL DEFAULT '',
          category TEXT NOT NULL DEFAULT 'General',
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS record_images (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          record_id INTEGER NOT NULL,
          file_name TEXT NOT NULL,
          position INTEGER NOT NULL DEFAULT 0,
          FOREIGN KEY (record_id) REFERENCES records(id) ON DELETE CASCADE
        );

        CREATE INDEX IF NOT EXISTS idx_images_record ON record_images(record_id);
        CREATE INDEX IF NOT EXISTS idx_records_category ON records(category);
      `);
      return db;
    })().catch((err) => {
      dbPromise = null; // allow retry
      throw err;
    });
  }
  return dbPromise;
}

/** List records (with first image as thumbnail), filtered by search text and category. */
export async function listRecords({ query = '', category = 'All' } = {}) {
  const db = await getDb();
  const like = `%${query.trim()}%`;
  return db.getAllAsync(
    `SELECT r.*,
            (SELECT file_name FROM record_images WHERE record_id = r.id ORDER BY position LIMIT 1) AS thumb,
            (SELECT COUNT(*) FROM record_images WHERE record_id = r.id) AS image_count
     FROM records r
     WHERE (r.title LIKE ? OR r.notes LIKE ?)
       AND (? = 'All' OR r.category = ?)
     ORDER BY r.created_at DESC`,
    [like, like, category, category]
  );
}

/** Get a single record with all of its images. Returns null if not found. */
export async function getRecord(id) {
  const db = await getDb();
  const record = await db.getFirstAsync('SELECT * FROM records WHERE id = ?', [id]);
  if (!record) return null;
  const images = await db.getAllAsync(
    'SELECT id, file_name FROM record_images WHERE record_id = ? ORDER BY position',
    [id]
  );
  return { ...record, images };
}

/** Create a record and its image rows atomically. Returns the new id. */
export async function createRecord({ title, notes, category, fileNames }) {
  const db = await getDb();
  const now = Date.now();
  let newId;
  await db.withTransactionAsync(async () => {
    const res = await db.runAsync(
      'INSERT INTO records (title, notes, category, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [title, notes, category, now, now]
    );
    newId = res.lastInsertRowId;
    for (let i = 0; i < fileNames.length; i++) {
      await db.runAsync(
        'INSERT INTO record_images (record_id, file_name, position) VALUES (?, ?, ?)',
        [newId, fileNames[i], i]
      );
    }
  });
  return newId;
}

/** Update a record and replace its image list (ordered) atomically. */
export async function updateRecord(id, { title, notes, category, fileNames }) {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      'UPDATE records SET title = ?, notes = ?, category = ?, updated_at = ? WHERE id = ?',
      [title, notes, category, Date.now(), id]
    );
    await db.runAsync('DELETE FROM record_images WHERE record_id = ?', [id]);
    for (let i = 0; i < fileNames.length; i++) {
      await db.runAsync(
        'INSERT INTO record_images (record_id, file_name, position) VALUES (?, ?, ?)',
        [id, fileNames[i], i]
      );
    }
  });
}

/** Delete a record (images rows cascade). Returns the file names so the caller can delete the files. */
export async function deleteRecord(id) {
  const db = await getDb();
  const rows = await db.getAllAsync('SELECT file_name FROM record_images WHERE record_id = ?', [id]);
  await db.runAsync('DELETE FROM records WHERE id = ?', [id]);
  return rows.map((r) => r.file_name);
}

/** Dashboard: record counts grouped by category. */
export async function getCategoryCounts() {
  const db = await getDb();
  return db.getAllAsync(
    'SELECT category, COUNT(*) AS count FROM records GROUP BY category ORDER BY count DESC'
  );
}
