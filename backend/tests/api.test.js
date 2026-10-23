'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { subirApi, llmFalso } = require('./helpers');
const thorOut = require('../../examples/ia-output-thor.json');
const thorIn = require('../../examples/ia-input-thor.json');

const REF = '?dataReferencia=2026-08-31';
const sem = (rs) => rs.map(({ regra, id, explicacao, ...r }) => r);

test('API de ponta a ponta: banco → contexto → IA → resposta (cenário Thor)', async (t) => {
  const api = await subirApi();
  t.after(() => api.fechar());

  await t.test('saúde e parâmetros', async () => {
    const h = await api.get('/api/saude');
    assert.equal(h.status, 200); assert.equal(h.json.status, 'ok'); assert.equal(h.json.ia.llm.habilitado, false);
    assert.equal((await api.get('/api/ia/parametros')).json.intervaloConsultaDias.idoso, 120);
  });

  await t.test('recomendações do Thor vindas do BANCO == saída documentada na Sprint 3', async () => {
    const r = await api.get('/api/pets/pet-001/recomendacoes' + REF);
    assert.equal(r.status, 200);
    assert.deepEqual(sem(r.json.recomendacoes), thorOut.recomendacoes.map(({ explicacao, ...x }) => x));
    assert.ok(r.json.analiseId > 0); assert.ok(r.json.recomendacoes.every((x) => x.id && x.explicacao));
    assert.equal(r.json.geracao.modo, 'template');
    assert.equal(r.json.aviso, thorOut.aviso);
  });

  await t.test('toda execução fica na trilha de auditoria com o contexto exato de entrada', async () => {
    const aud = await api.get('/api/clinica/auditoria');
    assert.ok(aud.json.length >= 1);
    const a = await api.get('/api/analises/' + aud.json[0].id);
    assert.equal(a.json.contexto.perfil.nome, 'Thor'); assert.equal(a.json.saida.totalRecomendacoes, 4);
  });

  await t.test('personalização: Mel (idosa, 128 dias) recebe R2; Bolt (adulto saudável) e Luna não recebem nada', async () => {
    assert.deepEqual((await api.get('/api/pets/pet-003/recomendacoes' + REF)).json.recomendacoes.map((r) => r.regra), ['R2']);
    assert.equal((await api.get('/api/pets/pet-004/recomendacoes' + REF)).json.totalRecomendacoes, 0);
    assert.equal((await api.get('/api/pets/pet-002/recomendacoes' + REF)).json.totalRecomendacoes, 0);
    const luna = await api.get('/api/pets/pet-002/recomendacoes?dataReferencia=2026-10-22');
    assert.deepEqual(luna.json.recomendacoes.map((r) => r.regra).sort(), ['R1', 'R2']);
  });

  await t.test('ações do usuário realimentam a IA: aplicar vacina remove R1; consulta remove R2; retorno remove R3', async () => {
    const vac = (await api.get('/api/pets/pet-001' + REF)).json.vacinas.find((v) => v.nome === 'Raiva');
    const ap = await api.post(`/api/pets/pet-001/vacinas/${vac.id}/aplicar`, { dataAplicacao: '2026-08-31' });
    assert.equal(ap.json.proximaDose, '2027-08-31');
    const med = (await api.get('/api/pets/pet-001' + REF)).json.medicamentos[0];
    await api.post(`/api/pets/pet-001/medicamentos/${med.id}/retorno-realizado`, { data: '2026-08-31' });
    await api.post('/api/pets/pet-001/consultas', { data: '2026-08-31', tipo: 'rotina' });
    const r = await api.get('/api/pets/pet-001/recomendacoes' + REF);
    assert.deepEqual(r.json.recomendacoes.map((x) => x.regra), ['R4']);
  });

  await t.test('IoT → IA: leituras PIR simuladas definem a variação de atividade e a fonte do dado (R4)', async () => {
    await api.post('/api/pets/pet-004/iot/simular', { perfil: 'normal' });
    assert.equal((await api.get('/api/pets/pet-004/recomendacoes' + REF)).json.totalRecomendacoes, 0);
    await api.post('/api/pets/pet-004/iot/simular', { perfil: 'queda' });
    const r = await api.get('/api/pets/pet-004/recomendacoes' + REF);
    assert.deepEqual(r.json.recomendacoes.map((x) => x.regra), ['R4']);
    assert.match(r.json.contextoComportamento.origem, /PIR IoT \(ESP32\)/);
    assert.equal(r.json.contextoComportamento.variacaoAtividadePercentual, -35);
    const iot = await api.get('/api/pets/pet-004/iot');
    assert.equal(iot.json.temperatura.valor, 38.4);
    const ing = await api.post('/api/pets/pet-004/iot', { tipo: 'temperatura', valor: 39.5 });
    assert.equal(ing.status, 201);
    assert.equal((await api.post('/api/pets/pet-004/iot', { tipo: 'pulso', valor: 1 })).status, 422);
    assert.equal((await api.post('/api/pets/pet-004/iot', { tipo: 'peso', valor: 'abc' })).status, 422);
  });

  await t.test('feedback do tutor e revisão clínica (humano no circuito) alimentam as métricas', async () => {
    const r = await api.get('/api/pets/pet-003/recomendacoes' + REF);
    const rid = r.json.recomendacoes[0].id;
    assert.equal((await api.post(`/api/recomendacoes/${rid}/feedback`, { feedback: 'agendado' })).status, 200);
    assert.equal((await api.post(`/api/recomendacoes/${rid}/feedback`, { feedback: 'xyz' })).status, 422);
    assert.equal((await api.post(`/api/recomendacoes/${rid}/revisao`, { revisao: 'aprovada' })).status, 200);
    assert.equal((await api.post('/api/recomendacoes/99999/feedback', { feedback: 'util' })).status, 404);
    const m = (await api.get('/api/clinica/metricas')).json;
    assert.equal(m.feedback.agendado, 1); assert.equal(m.feedback.taxaAdesao, 100); assert.equal(m.revisaoClinica.aprovada, 1);
    assert.ok(m.analisesExecutadas >= 5);
  });

  await t.test('painel da clínica ordena pacientes pelo maior score', async () => {
    const p = (await api.get('/api/clinica/painel?dataReferencia=2026-10-22')).json;
    const scores = p.pacientes.map((x) => x.scoreMaximo);
    assert.deepEqual(scores, [...scores].sort((a, b) => b - a));
    assert.equal(p.totalPacientes, 4);
  });

  await t.test('assistente: resposta fundamentada, guardrails e registro da conversa', async () => {
    const ok = await api.post('/api/pets/pet-003/chat', { mensagem: 'quando foi a última consulta?', dataReferencia: '2026-08-31' });
    assert.equal(ok.json.intencao, 'consulta'); assert.match(ok.json.resposta, /idoso.*120 dias/s);
    const rec = await api.post('/api/pets/pet-003/chat', { mensagem: 'que remédio dou?' });
    assert.equal(rec.json.modo, 'guardrail');
    assert.equal((await api.get('/api/clinica/metricas')).json.conversas, 2);
  });

  await t.test('/api/ia/analisar (stateless) reproduz a saída da Sprint 3 e valida a entrada', async () => {
    const r = await api.post('/api/ia/analisar', thorIn);
    assert.equal(r.status, 200); assert.deepEqual(sem(r.json.recomendacoes), thorOut.recomendacoes.map(({ explicacao, ...x }) => x));
    const inv = await api.post('/api/ia/analisar', { ...thorIn, perfil: { id: 'x', faseVida: 'senior' } });
    assert.equal(inv.status, 422); assert.match(inv.json.detalhes[0], /faseVida/);
  });

  await t.test('erros: 404 pet, 404 rota, 422 data inválida, 400 JSON malformado', async () => {
    assert.equal((await api.get('/api/pets/nao-existe/recomendacoes')).status, 404);
    assert.equal((await api.get('/api/rota-inexistente')).status, 404);
    assert.equal((await api.get('/api/pets/pet-001/recomendacoes?dataReferencia=hoje')).status, 422);
    const r = await fetch(api.base + '/api/ia/analisar', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{oops' });
    assert.equal(r.status, 400);
  });

  await t.test('cadastro de pet calcula a fase de vida automaticamente', async () => {
    const novo = await api.post('/api/pets', { nome: 'Nina', especie: 'gato', idadeAnos: 11 });
    assert.equal(novo.status, 201); assert.equal(novo.json.faseVida, 'idoso');
    assert.equal((await api.post('/api/pets', { nome: 'X', especie: 'coelho', idadeAnos: 1 })).status, 422);
    const r = await api.get(`/api/pets/${novo.json.id}/recomendacoes` + REF);
    assert.equal(r.json.totalRecomendacoes, 0);
    assert.equal(r.json.qualidadeDados.regrasNaoAvaliadas.length, 4);
  });
});

test('API com LLM (simulado): texto gerado é exposto com selo de validação; falha cai no template', async (t) => {
  const boas = JSON.stringify({ resumo: 'O Thor tem 4 cuidados pendentes.', explicacoes: ['A Raiva está atrasada há 16 dias.', 'O retorno passou há 11 dias.', 'A atividade caiu 35%.', 'Faz 211 dias da última consulta; referência de 180 dias.'] });
  const api = await subirApi({ llm: llmFalso(boas) });
  t.after(() => api.fechar());
  const r = await api.get('/api/pets/pet-001/recomendacoes' + REF);
  assert.equal(r.json.geracao.modo, 'llm'); assert.equal(r.json.geracao.modelo, 'llm-falso'); assert.equal(r.json.geracao.validacao.aprovado, true);
  assert.equal(r.json.recomendacoes[0].explicacao, 'A Raiva está atrasada há 16 dias.');
  assert.equal((await api.get('/api/saude')).json.ia.llm.habilitado, true);
  assert.deepEqual(r.json.recomendacoes.map((x) => x.score), [93, 90, 80, 70]);
});
