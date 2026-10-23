'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { explicar, explicarPorTemplate } = require('../src/ia/explicador');
const { validarTextoGerado, extrairJSON } = require('../src/ia/guardrails');
const { criarClienteLLM } = require('../src/ia/llmClient');
const { analisar } = require('../src/ia/motorRegras');
const { llmFalso } = require('./helpers');
const thor = require('../../examples/ia-input-thor.json');

const analise = analisar(thor);
const boas = () => JSON.stringify({
  resumo: 'O Thor tem 4 cuidados pendentes; o mais urgente é o reforço da Raiva.',
  explicacoes: ['A vacina de Raiva está atrasada há 16 dias, então vale agendar o reforço.', 'O retorno do tratamento passou há 11 dias; combine uma data com a clínica.', 'A atividade caiu 35%; converse com o veterinário sobre essa mudança.', 'Já se passaram 211 dias desde a última consulta; a referência para adultos é 180 dias.'],
});

test('modo offline: sem LLM usa template determinístico para tutor e clínica', async () => {
  const t = await explicar(analise, { publico: 'tutor', llm: null });
  assert.equal(t.geracao.modo, 'template'); assert.equal(t.explicacoes.length, 4);
  assert.match(t.explicacoes[0], /Agendar|agendar reforço de Raiva/);
  const c = await explicar(analise, { publico: 'clinica', llm: null });
  assert.match(c.explicacoes[0], /^R1 · score 93 \(ALTA\)/);
  assert.match(explicarPorTemplate(analisar({ ...thor, vacinas: [], consultas: [], medicamentos: [], comportamento: undefined }), 'tutor').resumo, /não encontrei nenhum cuidado pendente/);
});
test('LLM válido e fundamentado nos fatos é aceito', async () => {
  const r = await explicar(analise, { llm: llmFalso(boas()), dataReferencia: '2026-08-31' });
  assert.equal(r.geracao.modo, 'llm'); assert.equal(r.geracao.validacao.aprovado, true);
  assert.match(r.resumo, /Thor/);
});
test('LLM em bloco ```json é aceito (extração tolerante)', async () => {
  const r = await explicar(analise, { llm: llmFalso('```json\n' + boas() + '\n```'), dataReferencia: '2026-08-31' });
  assert.equal(r.geracao.modo, 'llm');
});
test('guardrail: número inventado (alucinação) → fallback para template', async () => {
  const ruim = JSON.parse(boas()); ruim.explicacoes[0] = 'A vacina está atrasada há 45 dias.';
  const r = await explicar(analise, { llm: llmFalso(JSON.stringify(ruim)), dataReferencia: '2026-08-31' });
  assert.equal(r.geracao.modo, 'template');
  assert.ok(r.geracao.validacao.motivos.some((m) => m.startsWith('numero_nao_fundamentado')));
  assert.match(r.explicacoes[0], /16 dia/);
});
test('guardrail: diagnóstico, dosagem, prescrição e "dispensar veterinário" são bloqueados', async () => {
  const casos = ['O diagnóstico é parvovirose.', 'Dê 5 mg do remédio duas vezes ao dia.', 'Ele tem uma infecção grave.', 'Não precisa ir ao veterinário.', 'Administre o antibiótico hoje.'];
  for (const c of casos) {
    const ruim = JSON.parse(boas()); ruim.explicacoes[1] = c;
    const r = await explicar(analise, { llm: llmFalso(JSON.stringify(ruim)), dataReferencia: '2026-08-31' });
    assert.equal(r.geracao.modo, 'template', 'deveria bloquear: ' + c);
  }
});
test('resposta fora do formato, quantidade divergente ou erro do LLM → fallback', async () => {
  assert.equal((await explicar(analise, { llm: llmFalso('desculpe, não sei'), dataReferencia: 'x' })).geracao.validacao.motivos[0], 'formato_invalido');
  const curto = JSON.stringify({ resumo: 'ok', explicacoes: ['a'] });
  assert.equal((await explicar(analise, { llm: llmFalso(curto), dataReferencia: 'x' })).geracao.validacao.motivos[0], 'quantidade_divergente');
  const falha = { modelo: 'm', gerar: async () => { throw new Error('timeout'); } };
  const r = await explicar(analise, { llm: falha, dataReferencia: 'x' });
  assert.equal(r.geracao.modo, 'template'); assert.match(r.geracao.fallbackMotivo, /timeout/);
});
test('o prompt enviado ao LLM contém só fatos mínimos (sem dados do tutor) e regras de segurança', async () => {
  let capturado;
  await explicar(analise, { llm: llmFalso((p) => { capturado = p; return boas(); }), dataReferencia: '2026-08-31' });
  assert.match(capturado.system, /NUNCA faça diagnóstico/);
  assert.ok(!/tutor-00|Tutor Demo/.test(capturado.user));
  assert.match(capturado.user, /"score": 93/);
});
test('validarTextoGerado / extrairJSON', () => {
  assert.equal(validarTextoGerado(['Faltam 16 dias.'], { m: '16 dias' }).aprovado, true);
  assert.equal(validarTextoGerado(['Faltam 17 dias.'], { m: '16 dias' }).aprovado, false);
  assert.equal(validarTextoGerado([''], {}).aprovado, false);
  assert.deepEqual(extrairJSON('texto {"a":1} fim'), { a: 1 });
  assert.equal(extrairJSON('sem json'), null);
});
test('guardrail (regressão): números 0–12 NÃO são liberados por padrão; só os presentes nos fatos', async () => {
  const fatos = { recomendacoes: [{ indice: 1, motivo: 'Vacina atrasada há 16 dias', score: 93 }], totalRecomendacoes: 1 };
  assert.equal(validarTextoGerado(['A vacina está atrasada há 16 dias.'], fatos).aprovado, true);
  for (const n of [12, 9, 45, 7, 11]) {
    const r = validarTextoGerado(['A vacina está atrasada há ' + n + ' dias.'], fatos);
    assert.equal(r.aprovado, false, n + ' dias deveria ser rejeitado');
    assert.ok(r.motivos.some((m) => m.startsWith('numero_nao_fundamentado')));
  }
  assert.equal(validarTextoGerado(['Cuidado 1 de 1: reforço da vacina.'], fatos).aprovado, true);
  assert.equal(validarTextoGerado(['Há 3 pendências.'], fatos).aprovado, false);
});
test('guardrail (regressão) fim a fim: LLM diz "12 dias" para vacina de 16 dias → fallback para template', async () => {
  for (const errado of ['12', '9']) {
    const ruim = JSON.parse(boas()); ruim.explicacoes[0] = 'A vacina de Raiva está atrasada há ' + errado + ' dias.';
    const r = await explicar(analise, { llm: llmFalso(JSON.stringify(ruim)), dataReferencia: '2026-08-31' });
    assert.equal(r.geracao.modo, 'template', errado + ' dias deveria cair no fallback');
    assert.match(r.explicacoes[0], /16 dia/);
  }
});
test('cliente LLM: nulo sem chave; monta requisição correta; propaga erro HTTP', async () => {
  assert.equal(criarClienteLLM({ apiKey: '' }), null);
  let req;
  const fetchOk = async (url, opt) => { req = { url, opt }; return { ok: true, json: async () => ({ content: [{ type: 'text', text: 'olá' }] }) }; };
  const c = criarClienteLLM({ apiKey: 'k', modelo: 'm1', url: 'http://x/v1/messages', timeoutMs: 1000 }, fetchOk);
  assert.equal(await c.gerar({ system: 's', user: 'u' }), 'olá');
  const corpo = JSON.parse(req.opt.body);
  assert.equal(corpo.model, 'm1'); assert.equal(corpo.system, 's'); assert.equal(req.opt.headers['x-api-key'], 'k');
  const c2 = criarClienteLLM({ apiKey: 'k', modelo: 'm', url: 'u' }, async () => ({ ok: false, status: 429 }));
  await assert.rejects(() => c2.gerar({ system: 's', user: 'u' }), /429/);
});
