'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { responderChat, classificar } = require('../src/ia/chat');
const { novoBanco, llmFalso, AGORA } = require('./helpers');
const { montarContexto, ultimasLeituras } = require('../src/services/contexto');
const { analisar } = require('../src/ia/motorRegras');

const db = novoBanco();
const ctx = montarContexto(db, 'pet-001', '2026-08-31', { agora: AGORA });
const analise = analisar(ctx);
const ask = (mensagem, llm = null, c = ctx, a = analise) => responderChat({ mensagem, contexto: c, analise: a, leituras: ultimasLeituras(db, 'pet-001'), llm });

test('classifica intenções (com e sem acentos)', () => {
  const casos = { 'Quais são os próximos cuidados?': 'proximos_cuidados', 'como estao as vacinas': 'vacinas', 'Quando foi a última consulta?': 'consulta', 'tem retorno pendente?': 'retorno', 'como está a atividade': 'atividade', 'qual a temperatura?': 'sensores', 'como você calcula o score?': 'como_funciona', 'oi': 'saudacao', 'blablabla': 'desconhecida' };
  for (const [m, i] of Object.entries(casos)) assert.equal(classificar(m), i, m);
});
test('respostas são fundamentadas nos dados do pet', async () => {
  assert.match((await ask('Como estão as vacinas?')).resposta, /Raiva.*ATRASADA há 16 dia/s);
  assert.match((await ask('Quais os próximos cuidados?')).resposta, /Agendar reforço de Raiva.*ALTA/s);
  assert.match((await ask('Quando foi a última consulta?')).resposta, /2026-02-01.*211 dias.*180 dias/s);
  assert.match((await ask('E o retorno do tratamento?')).resposta, /2026-08-20.*11 dia/s);
  assert.match((await ask('como está a atividade?')).resposta, /-35%/);
  assert.match((await ask('como você calcula as prioridades?')).resposta, /R1.*R2.*R3.*R4/s);
});
test('sensores: sem leituras informa; temperatura fora da faixa orienta contato com o veterinário', async () => {
  assert.match((await ask('temperatura')).resposta, /Ainda não recebi leituras/);
  const r = await responderChat({ mensagem: 'qual a temperatura?', contexto: ctx, analise, leituras: { temperatura: { valor: 40.1 } } });
  assert.match(r.resposta, /fora da faixa.*veterinário/s);
});
test('guardrail: emergência é tratada ANTES de qualquer LLM', async () => {
  let chamou = false;
  const r = await ask('meu cachorro está convulsionando e não respira', llmFalso(() => { chamou = true; return '{}'; }));
  assert.equal(r.intencao, 'emergencia'); assert.equal(r.modo, 'guardrail'); assert.equal(chamou, false);
  assert.match(r.resposta, /EMERGÊNCIA/);
});
test('guardrail: pedidos de diagnóstico e medicação são recusados com segurança', async () => {
  for (const m of ['qual remédio posso dar para ele?', 'qual a dose de dipirona?', 'o que ele tem?', 'faça um diagnóstico']) {
    const r = await ask(m);
    assert.equal(r.modo, 'guardrail', m); assert.match(r.intencao, /^recusa_/);
    assert.match(r.resposta, /veterinário/);
  }
});
test('LLM reescreve a resposta quando validada; resposta inventada é descartada', async () => {
  const bom = await ask('Como estão as vacinas?', llmFalso(JSON.stringify({ resposta: 'A Raiva do Thor está atrasada há 16 dias; a V10 está em dia.' })));
  assert.equal(bom.modo, 'llm');
  const ruim = await ask('Como estão as vacinas?', llmFalso(JSON.stringify({ resposta: 'A Raiva está atrasada há 99 dias.' })));
  assert.equal(ruim.modo, 'regra'); assert.match(ruim.resposta, /16 dia/);
  const erro = await ask('Como estão as vacinas?', { modelo: 'm', gerar: async () => { throw new Error('x'); } });
  assert.equal(erro.modo, 'regra');
});
test('mensagem vazia e intenção desconhecida', async () => {
  assert.equal((await ask('   ')).intencao, 'vazia');
  assert.match((await ask('asdf qwer')).resposta, /Não tenho certeza/);
});
