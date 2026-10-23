'use strict';

const FASES = ['filhote', 'adulto', 'idoso'];
const ISO_DATA = /^\d{4}-\d{2}-\d{2}$/;

function dataValida(s) {
  if (typeof s !== 'string' || !ISO_DATA.test(s)) return false;
  const d = new Date(s + 'T00:00:00Z');
  return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

function validarContexto(dados) {
  const erros = [];
  const avisos = [];
  const regrasNaoAvaliadas = [];

  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) {
    return { valido: false, erros: ['Corpo da requisição deve ser um objeto JSON.'], avisos, regrasNaoAvaliadas };
  }

  const ref = dados.dataReferencia;
  if (ref !== undefined && !dataValida(ref)) erros.push('dataReferencia deve estar no formato ISO-8601 (AAAA-MM-DD) e ser uma data real.');
  const refDate = dataValida(ref) ? new Date(ref + 'T00:00:00Z') : new Date();

  const perfil = dados.perfil;
  if (!perfil || typeof perfil !== 'object') {
    erros.push('perfil é obrigatório (id, nome, espécie e faseVida).');
  } else {
    if (!perfil.id) erros.push('perfil.id é obrigatório para vincular a análise ao pet.');
    if (!perfil.faseVida) {
      avisos.push('perfil.faseVida não informada: a regra R2 usará o intervalo padrão de adulto (180 dias).');
    } else if (!FASES.includes(perfil.faseVida)) {
      erros.push('perfil.faseVida inválida: use filhote, adulto ou idoso.');
    }
  }

  const checarData = (valor, campo, { futuroInvalido }) => {
    if (valor === undefined || valor === null) return;
    if (!dataValida(valor)) { erros.push(campo + ' deve estar no formato AAAA-MM-DD.'); return; }
    if (futuroInvalido && new Date(valor + 'T00:00:00Z') > refDate) {
      erros.push(campo + ' está no futuro em relação à data de referência (' + valor + ').');
    }
  };

  ['vacinas', 'consultas', 'medicamentos', 'historicoClinico'].forEach((k) => {
    if (dados[k] !== undefined && !Array.isArray(dados[k])) erros.push(k + ' deve ser uma lista.');
  });

  (Array.isArray(dados.vacinas) ? dados.vacinas : []).forEach((v, i) => {
    if (!v || !v.nome) erros.push('vacinas[' + i + '].nome é obrigatório.');
    if (!v || !v.proximaDose) { erros.push('vacinas[' + i + '].proximaDose é obrigatória para a regra R1.'); return; }
    checarData(v.proximaDose, 'vacinas[' + i + '].proximaDose', { futuroInvalido: false });
    if (dataValida(v.proximaDose)) {
      const vencida = new Date(v.proximaDose + 'T00:00:00Z') < refDate;
      if (v.status === 'em_dia' && vencida) avisos.push('Vacina ' + v.nome + ' está marcada como em_dia, mas a próxima dose já passou; a data prevalece.');
      if (v.status === 'atrasada' && !vencida) avisos.push('Vacina ' + v.nome + ' está marcada como atrasada, mas a próxima dose não venceu.');
    }
  });

  (Array.isArray(dados.consultas) ? dados.consultas : []).forEach((c, i) =>
    checarData(c && c.data, 'consultas[' + i + '].data', { futuroInvalido: true }));
  (Array.isArray(dados.historicoClinico) ? dados.historicoClinico : []).forEach((h, i) =>
    checarData(h && h.data, 'historicoClinico[' + i + '].data', { futuroInvalido: true }));
  (Array.isArray(dados.medicamentos) ? dados.medicamentos : []).forEach((m, i) => {
    if (m && m.retornoRecomendado && !m.dataRetorno) avisos.push('medicamentos[' + i + '] exige retorno mas não tem dataRetorno: R3 não pode avaliar este tratamento.');
    checarData(m && m.dataRetorno, 'medicamentos[' + i + '].dataRetorno', { futuroInvalido: false });
  });

  const comp = dados.comportamento;
  if (comp && comp.variacaoAtividadePercentual !== undefined && comp.variacaoAtividadePercentual !== null) {
    const n = Number(comp.variacaoAtividadePercentual);
    if (isNaN(n) || n < -100 || n > 1000) erros.push('comportamento.variacaoAtividadePercentual deve ser um número entre -100 e 1000.');
  }

  if (!Array.isArray(dados.vacinas) || dados.vacinas.length === 0) regrasNaoAvaliadas.push({ regra: 'R1', motivo: 'Sem vacinas cadastradas.' });
  if (!Array.isArray(dados.consultas) || dados.consultas.length === 0) regrasNaoAvaliadas.push({ regra: 'R2', motivo: 'Sem consultas registradas.' });
  if (!Array.isArray(dados.medicamentos) || !dados.medicamentos.some((m) => m && m.status === 'ativo')) regrasNaoAvaliadas.push({ regra: 'R3', motivo: 'Sem tratamento ativo com retorno.' });
  if (!comp || comp.variacaoAtividadePercentual === undefined || comp.variacaoAtividadePercentual === null) regrasNaoAvaliadas.push({ regra: 'R4', motivo: 'Sem dado de atividade (IoT ou tutor).' });

  return { valido: erros.length === 0, erros, avisos, regrasNaoAvaliadas };
}

module.exports = { validarContexto, dataValida, FASES };
