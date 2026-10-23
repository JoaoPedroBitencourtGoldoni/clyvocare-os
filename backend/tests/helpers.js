'use strict';
const { abrirBanco } = require('../src/db/database');
const { popular } = require('../src/db/seed');
const { criarApp } = require('../src/app');

const AGORA = new Date('2026-08-31T12:00:00Z');

function novoBanco() { const db = abrirBanco(':memory:'); popular(db); return db; }

async function subirApi({ llm = null } = {}) {
  const db = novoBanco();
  const app = criarApp({ db, config: { dataDemo: '2026-08-31' }, llm, mqtt: null, agora: () => AGORA });
  const server = await new Promise((res) => { const s = app.listen(0, () => res(s)); });
  const base = 'http://127.0.0.1:' + server.address().port;
  const http = async (method, url, body) => {
    const r = await fetch(base + url, { method, headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, json: await r.json() };
  };
  return { db, base, get: (u) => http('GET', u), post: (u, b) => http('POST', u, b || {}), fechar: () => new Promise((r) => server.close(r)) };
}

const llmFalso = (respostaOuFn) => ({ modelo: 'llm-falso', gerar: async (p) => (typeof respostaOuFn === 'function' ? respostaOuFn(p) : respostaOuFn) });

module.exports = { novoBanco, subirApi, llmFalso, AGORA };
