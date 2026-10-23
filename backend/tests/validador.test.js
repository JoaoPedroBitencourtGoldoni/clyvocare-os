'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { validarContexto } = require('../src/ia/validador');
const thor = require('../../examples/ia-input-thor.json');

test('entrada válida da Sprint 3 é aceita sem erros', () => {
  const v = validarContexto(thor);
  assert.equal(v.valido, true); assert.deepEqual(v.erros, []);
});
test('rejeita corpo inválido, faseVida inválida, datas inválidas e futuras', () => {
  assert.equal(validarContexto(null).valido, false);
  assert.equal(validarContexto([]).valido, false);
  const e = (o) => validarContexto({ ...thor, ...o }).erros.join('|');
  assert.match(e({ perfil: { ...thor.perfil, faseVida: 'senior' } }), /faseVida inválida/);
  assert.match(e({ dataReferencia: '31/08/2026' }), /ISO-8601/);
  assert.match(e({ dataReferencia: '2026-02-30' }), /data real/);
  assert.match(e({ consultas: [{ data: '2027-01-01' }] }), /futuro/);
  assert.match(e({ comportamento: { variacaoAtividadePercentual: 'abc' } }), /entre -100 e 1000/);
  assert.match(e({ vacinas: [{ nome: 'X' }] }), /proximaDose é obrigatória/);
  assert.match(e({ vacinas: 'x' }), /deve ser uma lista/);
  assert.match(e({ perfil: undefined }), /perfil é obrigatório/);
});
test('avisos de consistência e de contexto insuficiente (a IA não "chuta")', () => {
  const v = validarContexto({ ...thor, vacinas: [{ nome: 'V10', proximaDose: '2026-01-01', status: 'em_dia' }], medicamentos: [{ nome: 'T', status: 'ativo', retornoRecomendado: true }] });
  assert.ok(v.avisos.some((a) => /em_dia.*já passou/.test(a)));
  assert.ok(v.avisos.some((a) => /dataRetorno/.test(a)));
  const vazio = validarContexto({ perfil: { id: 'p', faseVida: 'adulto' } });
  assert.deepEqual(vazio.regrasNaoAvaliadas.map((r) => r.regra), ['R1', 'R2', 'R3', 'R4']);
  assert.equal(vazio.valido, true);
});
