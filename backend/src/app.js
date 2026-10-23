'use strict';
const path = require('path');
const express = require('express');
const { validarContexto, dataValida } = require('./ia/validador');
const { analisar, PARAMETROS } = require('./ia/motorRegras');
const { calcularFaseVida } = require('./ia/fase');
const { responderChat } = require('./ia/chat');
const { montarContexto, ultimasLeituras } = require('./services/contexto');
const { gerarRecomendacoes, ErroNegocio } = require('./services/recomendacaoService');
const { registrarLeitura, simularLeituras, TIPOS } = require('./services/iotService');

const FEEDBACKS = ['agendado', 'dispensado', 'util', 'nao_util'];
const REVISOES = ['aprovada', 'rejeitada'];
const addDias = (iso, n) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const hojeISO = () => new Date().toISOString().slice(0, 10);

function criarApp({ db, config, llm = null, mqtt = null, agora = () => new Date() }) {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.use(express.static(path.join(__dirname, '..', 'public')));

  const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
  const getPet = (id) => db.prepare('SELECT * FROM pets WHERE id = ?').get(id);
  const exigirPet = (req) => { const p = getPet(req.params.id); if (!p) throw new ErroNegocio(404, 'Pet não encontrado'); return p; };
  const refDe = (req) => {
    const r = req.query.dataReferencia || (req.body && req.body.dataReferencia);
    if (r !== undefined && !dataValida(r)) throw new ErroNegocio(422, 'dataReferencia inválida (use AAAA-MM-DD).');
    return r || agora().toISOString().slice(0, 10);
  };
  const publicar = mqtt ? mqtt.publicar : null;

  app.get('/api/saude', (req, res) => {
    db.prepare('SELECT 1').get();
    res.json({
      status: 'ok', versao: '4.0.0', banco: 'sqlite (' + (db.driver || 'n/d') + ')',
      ia: { motor: 'regras', llm: llm ? { habilitado: true, modelo: llm.modelo } : { habilitado: false, modo: 'template (offline)' } },
      mqtt: mqtt ? mqtt.estado() : { habilitado: false },
      dataDemo: config.dataDemo,
    });
  });
  app.get('/api/ia/parametros', (req, res) => res.json(PARAMETROS));

  app.post('/api/ia/analisar', (req, res) => {
    const q = validarContexto(req.body);
    if (!q.valido) return res.status(422).json({ erro: 'Dados inválidos para análise', detalhes: q.erros });
    const saida = analisar(req.body, { agora: agora() });
    res.json({ ...saida, qualidadeDados: { avisos: q.avisos, regrasNaoAvaliadas: q.regrasNaoAvaliadas } });
  });

  app.get('/api/pets', (req, res) => {
    const pets = db.prepare('SELECT p.id, p.nome, p.especie, p.idade_anos AS idadeAnos, p.fase_vida AS faseVida, t.nome AS tutor FROM pets p JOIN tutores t ON t.id = p.tutor_id ORDER BY p.id').all();
    res.json(pets);
  });
  app.post('/api/pets', (req, res) => {
    const { nome, especie, idadeAnos, tutorId = 'tutor-001' } = req.body || {};
    if (!nome || !['cao', 'gato'].includes(especie)) throw new ErroNegocio(422, 'Informe nome e espécie (cao | gato).');
    const fase = calcularFaseVida(especie, idadeAnos);
    if (!fase) throw new ErroNegocio(422, 'idadeAnos inválida.');
    if (!db.prepare('SELECT 1 FROM tutores WHERE id = ?').get(tutorId)) throw new ErroNegocio(404, 'Tutor não encontrado');
    const id = 'pet-' + String(db.prepare('SELECT COUNT(*) n FROM pets').get().n + 1).padStart(3, '0') + '-' + Date.now().toString(36).slice(-3);
    db.prepare('INSERT INTO pets (id, tutor_id, nome, especie, idade_anos, fase_vida, baseline_atividade_pct) VALUES (?,?,?,?,?,?,?)').run(id, tutorId, nome, especie, idadeAnos, fase, 50);
    res.status(201).json({ id, nome, especie, idadeAnos, faseVida: fase });
  });
  app.get('/api/pets/:id', (req, res) => {
    exigirPet(req);
    const ctx = montarContexto(db, req.params.id, refDe(req), { agora: agora() });
    res.json({ ...ctx, sensores: ultimasLeituras(db, req.params.id) });
  });

  app.get('/api/pets/:id/recomendacoes', wrap(async (req, res) => {
    exigirPet(req);
    const publico = req.query.publico === 'clinica' ? 'clinica' : 'tutor';
    const r = await gerarRecomendacoes(db, req.params.id, {
      dataReferencia: refDe(req), publico, explicarTexto: req.query.explicar !== 'false',
      persistir: req.query.persistir !== 'false', llm, publicar: req.query.publicarMqtt === 'false' ? null : publicar, agora: agora(),
    });
    res.json(r);
  }));
  app.post('/api/recomendacoes/:rid/feedback', (req, res) => {
    const { feedback } = req.body || {};
    if (!FEEDBACKS.includes(feedback)) throw new ErroNegocio(422, 'feedback deve ser um de: ' + FEEDBACKS.join(', '));
    const r = db.prepare("UPDATE recomendacoes SET feedback = ?, feedback_em = datetime('now') WHERE id = ?").run(feedback, req.params.rid);
    if (!r.changes) throw new ErroNegocio(404, 'Recomendação não encontrada');
    res.json({ id: Number(req.params.rid), feedback });
  });
  app.post('/api/recomendacoes/:rid/revisao', (req, res) => {
    const { revisao } = req.body || {};
    if (!REVISOES.includes(revisao)) throw new ErroNegocio(422, 'revisao deve ser: ' + REVISOES.join(' | '));
    const r = db.prepare("UPDATE recomendacoes SET revisao_clinica = ?, revisao_em = datetime('now') WHERE id = ?").run(revisao, req.params.rid);
    if (!r.changes) throw new ErroNegocio(404, 'Recomendação não encontrada');
    res.json({ id: Number(req.params.rid), revisao });
  });

  app.post('/api/pets/:id/vacinas/:vid/aplicar', (req, res) => {
    exigirPet(req);
    const v = db.prepare('SELECT * FROM vacinas WHERE id = ? AND pet_id = ?').get(req.params.vid, req.params.id);
    if (!v) throw new ErroNegocio(404, 'Vacina não encontrada');
    const data = (req.body && req.body.dataAplicacao) || hojeISO();
    if (!dataValida(data)) throw new ErroNegocio(422, 'dataAplicacao inválida.');
    const proxima = addDias(data, v.intervalo_dias);
    db.prepare('UPDATE vacinas SET proxima_dose = ? WHERE id = ?').run(proxima, v.id);
    db.prepare('INSERT INTO historico_clinico (pet_id, data, tipo, observacao) VALUES (?,?,?,?)').run(req.params.id, data, 'vacinacao', v.nome + ' aplicada');
    res.json({ vacina: v.nome, aplicadaEm: data, proximaDose: proxima });
  });
  app.post('/api/pets/:id/consultas', (req, res) => {
    exigirPet(req);
    const { data = hojeISO(), tipo = 'rotina' } = req.body || {};
    if (!dataValida(data)) throw new ErroNegocio(422, 'data inválida.');
    db.prepare('INSERT INTO consultas (pet_id, data, tipo) VALUES (?,?,?)').run(req.params.id, data, tipo);
    db.prepare('INSERT INTO historico_clinico (pet_id, data, tipo, observacao) VALUES (?,?,?,?)').run(req.params.id, data, 'consulta', 'consulta de ' + tipo);
    res.status(201).json({ data, tipo });
  });
  app.post('/api/pets/:id/medicamentos/:mid/retorno-realizado', (req, res) => {
    exigirPet(req);
    const r = db.prepare("UPDATE medicamentos SET status = 'concluido' WHERE id = ? AND pet_id = ?").run(req.params.mid, req.params.id);
    if (!r.changes) throw new ErroNegocio(404, 'Tratamento não encontrado');
    const data = (req.body && req.body.data) || hojeISO();
    db.prepare('INSERT INTO historico_clinico (pet_id, data, tipo, observacao) VALUES (?,?,?,?)').run(req.params.id, data, 'retorno', 'retorno do tratamento realizado');
    res.json({ ok: true });
  });
  app.post('/api/pets/:id/comportamento', (req, res) => {
    exigirPet(req);
    const { variacaoAtividadePercentual, observacao = null } = req.body || {};
    const n = Number(variacaoAtividadePercentual);
    if (variacaoAtividadePercentual === undefined || isNaN(n) || n < -100 || n > 1000) throw new ErroNegocio(422, 'variacaoAtividadePercentual deve ser um número entre -100 e 1000.');
    db.prepare('INSERT INTO comportamento_tutor (pet_id, variacao_atividade_pct, observacao) VALUES (?,?,?)').run(req.params.id, n, observacao);
    res.status(201).json({ variacaoAtividadePercentual: n });
  });

  app.get('/api/pets/:id/iot', (req, res) => { exigirPet(req); res.json(ultimasLeituras(db, req.params.id)); });
  app.post('/api/pets/:id/iot', (req, res) => {
    exigirPet(req);
    const { tipo, valor, ts } = req.body || {};
    if (!TIPOS.includes(tipo)) throw new ErroNegocio(422, 'tipo deve ser um de: ' + TIPOS.join(', '));
    try { registrarLeitura(db, req.params.id, tipo, valor, ts || Date.now()); } catch (e) { throw new ErroNegocio(422, e.message); }
    res.status(201).json({ ok: true });
  });
  app.post('/api/pets/:id/iot/simular', (req, res) => {
    exigirPet(req);
    const perfil = (req.body && req.body.perfil) === 'queda' ? 'queda' : 'normal';
    res.status(201).json(simularLeituras(db, req.params.id, { perfil, agora: agora().getTime() }));
  });

  app.post('/api/pets/:id/chat', wrap(async (req, res) => {
    exigirPet(req);
    const { mensagem, publico = 'tutor' } = req.body || {};
    const ref = refDe(req);
    const contexto = montarContexto(db, req.params.id, ref, { agora: agora() });
    const analise = analisar(contexto, { agora: agora() });
    const out = await responderChat({ mensagem, publico, contexto, analise, leituras: ultimasLeituras(db, req.params.id), llm });
    const ins = db.prepare('INSERT INTO conversas (pet_id, papel, texto, intencao, modo) VALUES (?,?,?,?,?)');
    ins.run(req.params.id, 'usuario', String(mensagem || ''), out.intencao, null);
    ins.run(req.params.id, 'assistente', out.resposta, out.intencao, out.modo);
    res.json(out);
  }));

  app.get('/api/clinica/painel', wrap(async (req, res) => {
    const ref = refDe(req);
    const pets = db.prepare('SELECT p.id, p.nome, p.especie, p.fase_vida AS faseVida, t.nome AS tutor FROM pets p JOIN tutores t ON t.id = p.tutor_id').all();
    const linhas = [];
    for (const p of pets) {
      const r = await gerarRecomendacoes(db, p.id, { dataReferencia: ref, explicarTexto: false, persistir: false, agora: agora() });
      linhas.push({ ...p, totalRecomendacoes: r.totalRecomendacoes, scoreMaximo: r.recomendacoes[0] ? r.recomendacoes[0].score : 0, prioridadeMaxima: r.recomendacoes[0] ? r.recomendacoes[0].prioridade : 'NENHUMA', recomendacoes: r.recomendacoes.map(({ regra, servico, acao, score, prioridade, motivo }) => ({ regra, servico, acao, score, prioridade, motivo })) });
    }
    linhas.sort((a, b) => b.scoreMaximo - a.scoreMaximo || a.nome.localeCompare(b.nome));
    res.json({ dataReferencia: ref, totalPacientes: linhas.length, comPendencias: linhas.filter((l) => l.totalRecomendacoes > 0).length, pacientes: linhas });
  }));
  app.get('/api/clinica/metricas', (req, res) => {
    const n = (sql) => db.prepare(sql).get().n;
    const agendado = n("SELECT COUNT(*) n FROM recomendacoes WHERE feedback = 'agendado'");
    const dispensado = n("SELECT COUNT(*) n FROM recomendacoes WHERE feedback = 'dispensado'");
    res.json({
      analisesExecutadas: n('SELECT COUNT(*) n FROM analises'),
      recomendacoesGeradas: n('SELECT COUNT(*) n FROM recomendacoes'),
      porPrioridade: db.prepare('SELECT prioridade, COUNT(*) n FROM recomendacoes GROUP BY prioridade').all(),
      porRegra: db.prepare('SELECT regra, COUNT(*) n FROM recomendacoes GROUP BY regra ORDER BY regra').all(),
      feedback: { agendado, dispensado, util: n("SELECT COUNT(*) n FROM recomendacoes WHERE feedback = 'util'"), naoUtil: n("SELECT COUNT(*) n FROM recomendacoes WHERE feedback = 'nao_util'"), taxaAdesao: agendado + dispensado ? Math.round((agendado / (agendado + dispensado)) * 100) : null },
      revisaoClinica: { aprovada: n("SELECT COUNT(*) n FROM recomendacoes WHERE revisao_clinica = 'aprovada'"), rejeitada: n("SELECT COUNT(*) n FROM recomendacoes WHERE revisao_clinica = 'rejeitada'") },
      explicacao: db.prepare('SELECT modo_explicacao modo, COUNT(*) n FROM analises GROUP BY modo_explicacao').all(),
      conversas: n("SELECT COUNT(*) n FROM conversas WHERE papel = 'usuario'"),
    });
  });
  app.get('/api/clinica/auditoria', (req, res) => {
    const limite = Math.min(Number(req.query.limite) || 20, 100);
    res.json(db.prepare('SELECT id, pet_id AS petId, data_referencia AS dataReferencia, gerado_em AS geradoEm, publico, modo_explicacao AS modoExplicacao FROM analises ORDER BY id DESC LIMIT ?').all(limite));
  });
  app.get('/api/analises/:aid', (req, res) => {
    const a = db.prepare('SELECT * FROM analises WHERE id = ?').get(req.params.aid);
    if (!a) throw new ErroNegocio(404, 'Análise não encontrada');
    res.json({ id: a.id, contexto: JSON.parse(a.contexto_json), saida: JSON.parse(a.saida_json) });
  });

  app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));
  app.use((err, req, res, next) => {
    const status = err.status || (err instanceof SyntaxError ? 400 : 500);
    if (status === 500) console.error(err);
    res.status(status).json({ erro: status === 500 ? 'Erro interno' : err.message, detalhes: err.detalhes });
  });
  return app;
}

module.exports = { criarApp };
