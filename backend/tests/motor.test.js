'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { analisar } = require('../src/ia/motorRegras');
const thorIn = require('../../examples/ia-input-thor.json');
const thorOut = require('../../examples/ia-output-thor.json');

const base = (over = {}) => ({
  dataReferencia: '2026-08-31',
  perfil: { id: 'p', nome: 'X', especie: 'cao', faseVida: 'adulto' },
  vacinas: [{ nome: 'Raiva', proximaDose: '2027-01-01', status: 'em_dia' }],
  consultas: [{ data: '2026-08-01', tipo: 'rotina' }],
  medicamentos: [], comportamento: { variacaoAtividadePercentual: 0 }, ...over,
});

test('Caso 1 — cenário Thor reproduz exatamente a saída documentada na Sprint 3', () => {
  const o = analisar(thorIn);
  assert.equal(o.totalRecomendacoes, 4);
  assert.deepEqual(o.recomendacoes.map(({ regra, ...r }) => r), thorOut.recomendacoes);
  assert.deepEqual(o.recomendacoes.map((r) => [r.servico, r.score, r.prioridade]),
    [['Vacinação', 93, 'ALTA'], ['Retorno clínico', 90, 'ALTA'], ['Avaliação veterinária', 80, 'MEDIA'], ['Consulta preventiva', 70, 'MEDIA']]);
  assert.equal(o.aviso, thorOut.aviso);
});

test('Caso 2 — pet adulto sem pendências não recebe recomendação', () => {
  assert.equal(analisar(base()).totalRecomendacoes, 0);
});

test('Caso 3 — personalização por fase de vida (130 dias sem consulta)', () => {
  const c = [{ data: '2026-04-24', tipo: 'rotina' }];
  const idoso = analisar(base({ perfil: { id: 'p', faseVida: 'idoso' }, consultas: c }));
  const adulto = analisar(base({ consultas: c }));
  const filhote = analisar(base({ perfil: { id: 'p', faseVida: 'filhote' }, consultas: c }));
  assert.equal(idoso.recomendacoes[0].servico, 'Consulta preventiva');
  assert.equal(idoso.recomendacoes[0].score, 70);
  assert.equal(idoso.recomendacoes[0].prioridade, 'MEDIA');
  assert.equal(adulto.totalRecomendacoes, 0);
  assert.equal(filhote.totalRecomendacoes, 1);
});

test('Caso 4 — escalonamento de vacina atrasada com teto em 100', () => {
  const v = (dias) => { const d = new Date('2026-08-31T00:00:00Z'); d.setUTCDate(d.getUTCDate() - dias); return analisar(base({ vacinas: [{ nome: 'V10', proximaDose: d.toISOString().slice(0, 10), status: 'atrasada' }] })).recomendacoes[0].score; };
  assert.equal(v(1), 85.5);
  assert.equal(v(16), 93);
  assert.equal(v(30), 100);
  assert.equal(v(40), 100);
});

test('Caso 5 — limiar comportamental: -29% não dispara, -30% dispara com score 80', () => {
  assert.equal(analisar(base({ comportamento: { variacaoAtividadePercentual: -29 } })).totalRecomendacoes, 0);
  const o = analisar(base({ comportamento: { variacaoAtividadePercentual: -30 } }));
  assert.equal(o.totalRecomendacoes, 1);
  assert.equal(o.recomendacoes[0].score, 80);
});

test('Caso 6 — retorno clínico: vencido gera 90; na data ou futuro não gera', () => {
  const med = (d) => base({ medicamentos: [{ nome: 'T', status: 'ativo', retornoRecomendado: true, dataRetorno: d }] });
  assert.equal(analisar(med('2026-08-30')).recomendacoes[0].score, 90);
  assert.equal(analisar(med('2026-08-31')).totalRecomendacoes, 0);
  assert.equal(analisar(med('2026-09-10')).totalRecomendacoes, 0);
  const concluido = base({ medicamentos: [{ nome: 'T', status: 'concluido', retornoRecomendado: true, dataRetorno: '2026-01-01' }] });
  assert.equal(analisar(concluido).totalRecomendacoes, 0);
});

test('Critérios de aceite — determinismo, ordenação, explicabilidade e ausência de diagnóstico', () => {
  const a = analisar(thorIn); const b = analisar(thorIn);
  assert.deepEqual(a.recomendacoes, b.recomendacoes);
  const scores = a.recomendacoes.map((r) => r.score);
  assert.deepEqual(scores, [...scores].sort((x, y) => y - x));
  for (const r of a.recomendacoes) {
    assert.ok(r.motivo && r.dadosUtilizados.length > 0);
    assert.ok(!/diagn[oó]stic(o|ar) (é|de)|doen[çc]a confirmada/i.test(r.motivo + r.acao));
  }
});

test('Variação de atividade ausente (null) não dispara R4', () => {
  assert.equal(analisar(base({ comportamento: { variacaoAtividadePercentual: null } })).totalRecomendacoes, 0);
  assert.equal(analisar(base({ comportamento: undefined })).totalRecomendacoes, 0);
});
