const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', '..', 'data', 'tracker.db');

let db;
let initPromise;

/**
 * Wrapper around sql.js Database to provide a better-sqlite3-like API.
 */
class DatabaseWrapper {
  constructor(sqlDb, dbPath) {
    this._db = sqlDb;
    this._dbPath = dbPath;
  }

  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        self._db.run(sql, params);
        const lastId = self._db.exec('SELECT last_insert_rowid() as id')[0];
        const changes = self._db.getRowsModified();
        self._save();
        return {
          lastInsertRowid: lastId ? lastId.values[0][0] : 0,
          changes,
        };
      },
      get(...params) {
        const stmt = self._db.prepare(sql);
        stmt.bind(params);
        if (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          stmt.free();
          const row = {};
          cols.forEach((col, i) => { row[col] = vals[i]; });
          return row;
        }
        stmt.free();
        return undefined;
      },
      all(...params) {
        const stmt = self._db.prepare(sql);
        stmt.bind(params);
        const rows = [];
        while (stmt.step()) {
          const cols = stmt.getColumnNames();
          const vals = stmt.get();
          const row = {};
          cols.forEach((col, i) => { row[col] = vals[i]; });
          rows.push(row);
        }
        stmt.free();
        return rows;
      },
    };
  }

  exec(sql) {
    this._db.exec(sql);
    this._save();
  }

  pragma(sql) {
    this._db.exec(`PRAGMA ${sql}`);
  }

  _save() {
    const data = this._db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(this._dbPath, buffer);
  }
}

async function initializeDatabase(dbPath) {
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const SQL = await initSqlJs();

  let sqlDb;
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    sqlDb = new SQL.Database(fileBuffer);
  } else {
    sqlDb = new SQL.Database();
  }

  const wrapper = new DatabaseWrapper(sqlDb, dbPath);

  // Enable foreign key enforcement
  wrapper.pragma('foreign_keys = ON');

  // Run schema
  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  wrapper.exec(schema);

  return wrapper;
}

function getDatabase() {
  if (db) return db;
  throw new Error('Database not initialized. Call initDatabaseAsync() first.');
}

async function initDatabaseAsync(dbPath) {
  if (db) return db;
  if (!initPromise) {
    initPromise = initializeDatabase(dbPath || DB_PATH).then(wrapper => {
      db = wrapper;
      return db;
    });
  }
  return initPromise;
}

module.exports = { initializeDatabase, getDatabase, initDatabaseAsync };
