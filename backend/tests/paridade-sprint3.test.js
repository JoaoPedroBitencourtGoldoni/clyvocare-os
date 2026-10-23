'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const path = require('node:path');
const flow = require(path.join(__dirname, '..', '..', 'node-red', 'clyvocare-nodered-flow.json'));
const { analisar } = require('../src/ia/motorRegras');

const no = flow.find((n) => n.type === 'function' && n.name === 'Motor de Regras Inteligentes');
const original = new vm.Script('(function(msg){' + no.func + '})').runInNewContext({});

function prng(seed) { let a = seed; return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const iso = (base, dias) => { const d = new Date(base + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + dias); return d.toISOString().slice(0, 10); };

function gerar(r) {
  const ri = (a, b) => a + Math.floor(r() * (b - a + 1));
  const ref = iso('2026-01-01', ri(0, 300));
  const fases = ['filhote', 'adulto', 'idoso', undefined];
  const e = { dataReferencia: ref, perfil: { id: 'p' + ri(1, 9), nome: 'N', especie: r() > .5 ? 'cao' : 'gato', faseVida: fases[ri(0, 3)] } };
  e.vacinas = Array.from({ length: ri(0, 3) }, (_, i) => { const d = iso(ref, ri(-60, 120)); return { nome: 'V' + i, proximaDose: d, status: d < ref ? 'atrasada' : 'em_dia' }; });
  e.consultas = Array.from({ length: ri(0, 3) }, () => ({ data: iso(ref, -ri(1, 400)), tipo: 'rotina' }));
  e.medicamentos = Array.from({ length: ri(0, 2) }, () => ({ nome: 'M', status: r() > .3 ? 'ativo' : 'concluido', retornoRecomendado: r() > .3, dataRetorno: r() > .15 ? iso(ref, ri(-40, 30)) : undefined }));
  if (r() > .2) e.comportamento = { variacaoAtividadePercentual: ri(-80, 30) };
  return e;
}

test('paridade com o nó Node-RED da Sprint 3 em 600 entradas aleatórias', () => {
  const r = prng(20260909);
  let comRecs = 0;
  for (let i = 0; i < 600; i++) {
    const entrada = gerar(r);
    const velho = original({ payload: JSON.parse(JSON.stringify(entrada)) }).payload;
    const novo = analisar(entrada);
    const norm = (recs) => JSON.parse(JSON.stringify(recs.map(({ regra, ...x }) => x)));
    assert.deepEqual(norm(novo.recomendacoes), JSON.parse(JSON.stringify(velho.recomendacoes)), 'divergência na entrada #' + i);
    assert.equal(novo.totalRecomendacoes, velho.totalRecomendacoes);
    if (novo.totalRecomendacoes) comRecs++;
  }
  assert.ok(comRecs > 200, 'o gerador deve cobrir muitos casos com recomendações (cobertura: ' + comRecs + ')');
});
