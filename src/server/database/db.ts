import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SERVER_CONFIG } from '../config.ts';
import { BRIGG_SCHEMA_SQL } from './schema.ts';

let dbInstance: DatabaseSync | null = null;

export function getDb(customPath?: string): DatabaseSync {
  if (dbInstance && !customPath) return dbInstance;

  const targetPath = customPath || (process.env.NODE_ENV === 'test' ? ':memory:' : SERVER_CONFIG.dbPath);
  if (targetPath !== ':memory:') {
    const dir = path.dirname(path.resolve(targetPath));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(targetPath);
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(BRIGG_SCHEMA_SQL);

  // Seed default chain if absent
  db.prepare(
    `INSERT OR IGNORE INTO chains (id, name, native_symbol, enabled) VALUES (?, ?, ?, ?)`
  ).run('solana', 'Solana', 'SOL', 1);

  if (!customPath) {
    dbInstance = db;
  }
  return db;
}

export function resetDbForTests(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

export function logAudit(action: string, actor: string, detail: string): void {
  try {
    const db = getDb();
    db.prepare(
      `INSERT INTO audit_logs (id, timestamp, action, actor, detail) VALUES (?, ?, ?, ?, ?)`
    ).run(
      `aud_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      new Date().toISOString(),
      action,
      actor,
      detail.slice(0, 500)
    );
  } catch {
    // Do not fail business logic if audit write encounters transient lock
  }
}
