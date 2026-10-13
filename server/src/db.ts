// SQLite persistence via Node's built-in node:sqlite (no native deps).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

export type DB = DatabaseSync;

export function openDb(file: string): DB {
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      pass_hash TEXT NOT NULL,
      salt TEXT NOT NULL,
      created INTEGER NOT NULL,
      last_login INTEGER
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS profiles (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data TEXT NOT NULL,
      updated INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS arena (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      points INTEGER NOT NULL DEFAULT 1000,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      defense TEXT,
      updated INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS arena_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attacker INTEGER NOT NULL,
      defender INTEGER NOT NULL,
      win INTEGER NOT NULL,
      delta INTEGER NOT NULL,
      time INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS arena_log_def ON arena_log(defender, time);
    CREATE TABLE IF NOT EXISTS rta (
      user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      mmr INTEGER NOT NULL DEFAULT 1200,
      wins INTEGER NOT NULL DEFAULT 0,
      losses INTEGER NOT NULL DEFAULT 0,
      updated INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rta_matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      p1 INTEGER NOT NULL,
      p2 INTEGER NOT NULL,
      winner INTEGER NOT NULL,
      draft TEXT NOT NULL,
      time INTEGER NOT NULL
    );
  `);
  return db;
}
