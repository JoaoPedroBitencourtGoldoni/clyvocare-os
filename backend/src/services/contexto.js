'use strict';
const { montarComportamento } = require('../ia/atividade');

function statusVacina(proximaDose, ref) {
  return new Date(proximaDose) < new Date(ref) ? 'atrasada' : 'em_dia';
}

function montarContexto(db, petId, dataReferencia, { agora = new Date() } = {}) {
  const p = db.prepare('SELECT * FROM pets WHERE id = ?').get(petId);
  if (!p) return null;

  const vacinas = db.prepare('SELECT id, nome, proxima_dose, intervalo_dias FROM vacinas WHERE pet_id = ? ORDER BY proxima_dose').all(petId)
    .map((v) => ({ id: v.id, nome: v.nome, proximaDose: v.proxima_dose, intervaloDias: v.intervalo_dias, status: statusVacina(v.proxima_dose, dataReferencia) }));
  const consultas = db.prepare('SELECT data, tipo FROM consultas WHERE pet_id = ? ORDER BY data DESC').all(petId);
  const historicoClinico = db.prepare('SELECT data, tipo, observacao FROM historico_clinico WHERE pet_id = ? ORDER BY data DESC').all(petId);
  const medicamentos = db.prepare('SELECT id, nome, status, retorno_recomendado, data_retorno FROM medicamentos WHERE pet_id = ?').all(petId)
    .map((m) => ({ id: m.id, nome: m.nome, status: m.status, retornoRecomendado: !!m.retorno_recomendado, dataRetorno: m.data_retorno }));

  const leituras = db.prepare("SELECT ts, valor FROM leituras_iot WHERE pet_id = ? AND tipo = 'movimento' ORDER BY ts DESC LIMIT 5000").all(petId);
  const tutor = db.prepare('SELECT variacao_atividade_pct, criado_em FROM comportamento_tutor WHERE pet_id = ? ORDER BY id DESC LIMIT 1').get(petId);
  const comportamento = montarComportamento(leituras, p.baseline_atividade_pct, tutor, { agora });

  const contexto = {
    dataReferencia,
    perfil: { id: p.id, nome: p.nome, especie: p.especie, idadeAnos: p.idade_anos, faseVida: p.fase_vida },
    historicoClinico, vacinas, consultas, medicamentos,
  };
  if (comportamento) contexto.comportamento = comportamento;
  return contexto;
}

function ultimasLeituras(db, petId) {
  const out = {};
  for (const tipo of ['temperatura', 'umidade', 'peso', 'movimento']) {
    const r = db.prepare('SELECT valor, ts FROM leituras_iot WHERE pet_id = ? AND tipo = ? ORDER BY ts DESC LIMIT 1').get(petId, tipo);
    if (r) out[tipo] = r;
  }
  return out;
}

module.exports = { montarContexto, ultimasLeituras, statusVacina };
