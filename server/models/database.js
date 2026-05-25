const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "data", "finance.db");

const fs = require("fs");
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    description TEXT,
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    category TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('income', 'expense', 'investment')),
    source TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('bank', 'investment', 'credit', 'loan', 'other')),
    balance REAL NOT NULL DEFAULT 0,
    currency TEXT NOT NULL DEFAULT 'USD',
    country TEXT NOT NULL DEFAULT 'USA',
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS exchange_rates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_currency TEXT NOT NULL,
    to_currency TEXT NOT NULL,
    rate REAL NOT NULL,
    date TEXT NOT NULL,
    UNIQUE(from_currency, to_currency, date)
  );

  CREATE TABLE IF NOT EXISTS uploaded_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT NOT NULL,
    processed INTEGER DEFAULT 0,
    records_imported INTEGER DEFAULT 0,
    uploaded_at TEXT DEFAULT (datetime('now'))
  );
`);

// Insert default exchange rate if none exist
const rateCount = db.prepare("SELECT COUNT(*) as cnt FROM exchange_rates").get();
if (rateCount.cnt === 0) {
  db.prepare(
    "INSERT INTO exchange_rates (from_currency, to_currency, rate, date) VALUES (?, ?, ?, date('now'))"
  ).run("USD", "INR", 83.5);
  db.prepare(
    "INSERT INTO exchange_rates (from_currency, to_currency, rate, date) VALUES (?, ?, ?, date('now'))"
  ).run("INR", "USD", 0.012);
}

module.exports = db;
