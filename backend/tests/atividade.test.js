'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { calcularAtividadeIoT, montarComportamento } = require('../src/ia/atividade');

const agora = new Date('2026-08-31T12:00:00Z');
const leituras = (n, ativas) => Array.from({ length: n }, (_, i) => ({ ts: agora.getTime() - i * 600000, valor: i < ativas ? 1 : 0 }));

test('calcula variação % da atividade PIR em relação ao baseline do pet', () => {
  const r = calcularAtividadeIoT(leituras(100, 39), 60, { agora });
  assert.equal(r.variacaoAtividadePercentual, -35);
  assert.equal(r.atividadeAtualPct, 39);
  assert.equal(calcularAtividadeIoT(leituras(100, 60), 60, { agora }).variacaoAtividadePercentual, 0);
  assert.equal(calcularAtividadeIoT(leituras(100, 90), 60, { agora }).variacaoAtividadePercentual, 50);
});
test('poucas amostras ou sem baseline → null (não infere)', () => {
  assert.equal(calcularAtividadeIoT(leituras(5, 2), 60, { agora }), null);
  assert.equal(calcularAtividadeIoT(leituras(100, 40), null, { agora }), null);
});
test('ignora leituras fora da janela de 24h', () => {
  const antigas = leituras(100, 0).map((l) => ({ ...l, ts: l.ts - 3 * 86400000 }));
  assert.equal(calcularAtividadeIoT(antigas, 60, { agora }), null);
});
test('IoT tem prioridade; sem IoT usa o registro do tutor; sem nada retorna null', () => {
  const tutor = { variacao_atividade_pct: -20 };
  assert.match(montarComportamento(leituras(100, 39), 60, tutor, { agora }).origem, /PIR IoT/);
  assert.equal(montarComportamento([], 60, tutor, { agora }).origem, 'registro do tutor');
  assert.equal(montarComportamento([], 60, null, { agora }), null);
});
