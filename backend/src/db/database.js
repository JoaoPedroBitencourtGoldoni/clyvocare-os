'use strict';
const fs = require('fs');
const path = require('path');

function carregarNodeSqlite() {
  const original = process.emitWarning;
  process.emitWarning = function (w, ...resto) {
    if (String((w && w.message) || w).includes('SQLite')) return;
    return original.call(process, w, ...resto);
  };
  try { return require('node:sqlite'); } catch (_) { return null; } finally { process.emitWarning = original; }
}

const plano = (r) => (r && typeof r === 'object' ? { ...r } : r);

function adaptarNodeSqlite(db) {
  return {
    driver: 'node:sqlite',
    exec: (sql) => db.exec(sql),
    prepare(sql) {
      const st = db.prepare(sql);
      return {
        get: (...a) => plano(st.get(...a)),
        all: (...a) => st.all(...a).map(plano),
        run: (...a) => { const r = st.run(...a); return { changes: Number(r.changes), lastInsertRowid: Number(r.lastInsertRowid) }; },
      };
    },
    transaction(fn) {
      return (...args) => {
        db.exec('BEGIN');
        try { const r = fn(...args); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
      };
    },
    close: () => db.close(),
  };
}

function adaptarBetter(db) {
  return { driver: 'better-sqlite3', exec: (s) => db.exec(s), prepare: (s) => db.prepare(s), transaction: (f) => db.transaction(f), close: () => db.close() };
}

function abrirBanco(dbPath) {
  if (dbPath !== ':memory:') fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const preferido = process.env.CLYVO_SQLITE || 'auto';
  let db = null;

  if (preferido === 'auto' || preferido === 'node') {
    const ns = carregarNodeSqlite();
    if (ns && ns.DatabaseSync) db = adaptarNodeSqlite(new ns.DatabaseSync(dbPath));
  }
  if (!db && (preferido === 'auto' || preferido === 'better-sqlite3')) {
    try { const Better = require('better-sqlite3'); db = adaptarBetter(new Better(dbPath)); } catch (_) {  }
  }
  if (!db) {
    throw new Error('Nenhum driver SQLite disponível. Use Node.js 22.13+ (SQLite embutido) ou rode "npm install" para instalar o better-sqlite3 opcional.');
  }
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  return db;
}

module.exports = { abrirBanco };
