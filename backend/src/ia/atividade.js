'use strict';

const MIN_AMOSTRAS = 12;
const JANELA_HORAS_PADRAO = 24;

function calcularAtividadeIoT(leiturasMovimento, baselinePct, { agora = new Date(), janelaHoras = JANELA_HORAS_PADRAO } = {}) {
  if (!baselinePct || baselinePct <= 0) return null;
  const limite = agora.getTime() - janelaHoras * 3600 * 1000;
  const janela = (leiturasMovimento || []).filter((l) => l.ts >= limite && l.ts <= agora.getTime() + 60000);
  if (janela.length < MIN_AMOSTRAS) return null;
  const ativas = janela.filter((l) => Number(l.valor) === 1).length;
  const atualPct = (ativas / janela.length) * 100;
  const variacao = Math.round(((atualPct - baselinePct) / baselinePct) * 100);
  return { variacaoAtividadePercentual: variacao, atividadeAtualPct: Math.round(atualPct * 10) / 10, baselinePct, amostras: janela.length };
}

function montarComportamento(leiturasMovimento, baselinePct, registroTutor, opcoes = {}) {
  const iot = calcularAtividadeIoT(leiturasMovimento, baselinePct, opcoes);
  if (iot) {
    return {
      variacaoAtividadePercentual: iot.variacaoAtividadePercentual,
      origem: 'PIR IoT (ESP32) — ' + iot.amostras + ' leituras em ' + (opcoes.janelaHoras || JANELA_HORAS_PADRAO) + 'h',
      detalhes: iot,
    };
  }
  if (registroTutor && registroTutor.variacao_atividade_pct !== null && registroTutor.variacao_atividade_pct !== undefined) {
    return { variacaoAtividadePercentual: registroTutor.variacao_atividade_pct, origem: 'registro do tutor' };
  }
  return null;
}

module.exports = { calcularAtividadeIoT, montarComportamento, MIN_AMOSTRAS, JANELA_HORAS_PADRAO };
