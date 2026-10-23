'use strict';
const MS_DIA = 1000 * 60 * 60 * 24;

const PARAMETROS = Object.freeze({
  intervaloConsultaDias: Object.freeze({ filhote: 90, adulto: 180, idoso: 120 }),
  vacina: Object.freeze({ base: 85, tetoAtrasoDias: 30, divisor: 2, max: 100 }),
  scoreConsultaPreventiva: 70,
  scoreRetornoClinico: 90,
  scoreComportamento: 80,
  limiarQuedaAtividadePct: -30,
  faixas: Object.freeze({ alta: 90, media: 60 }),
});

const AVISO = 'As recomendações apoiam a decisão e não substituem avaliação veterinária.';

function diasEntre(dataInicial, dataFinal) {
  const inicio = new Date(dataInicial);
  if (isNaN(inicio.getTime())) return 0;
  return Math.floor((dataFinal - inicio) / MS_DIA);
}

function prioridade(score) {
  if (score >= PARAMETROS.faixas.alta) return 'ALTA';
  if (score >= PARAMETROS.faixas.media) return 'MEDIA';
  return 'BAIXA';
}

function intervaloConsulta(faseVida) {
  const t = PARAMETROS.intervaloConsultaDias;
  return faseVida === 'idoso' ? t.idoso : faseVida === 'filhote' ? t.filhote : t.adulto;
}

function analisar(dados, opcoes = {}) {
  dados = dados || {};
  const pet = dados.perfil || {};
  const agora = opcoes.agora || new Date();
  const referencia = new Date(dados.dataReferencia || agora.toISOString().slice(0, 10));
  const recomendacoes = [];

  const adicionar = (regra, servico, acao, score, motivo, dadosUtilizados) =>
    recomendacoes.push({ regra, servico, acao, score, prioridade: prioridade(score), motivo, dadosUtilizados });

  (dados.vacinas || []).forEach((vacina) => {
    const atraso = diasEntre(vacina.proximaDose, referencia);
    if (vacina.status === 'atrasada' || atraso > 0) {
      const v = PARAMETROS.vacina;
      const score = Math.min(v.max, v.base + Math.min(Math.max(atraso, 0), v.tetoAtrasoDias) / v.divisor);
      adicionar('R1', 'Vacinação', 'Agendar reforço de ' + vacina.nome, score,
        vacina.nome + ' está atrasada há ' + atraso + ' dia(s).', ['vacinas', 'perfil']);
    }
  });

  const intervalo = intervaloConsulta(pet.faseVida);
  if ((dados.consultas || []).length > 0) {
    const ordenadas = dados.consultas.slice().sort((a, b) => new Date(b.data) - new Date(a.data));
    const diasSemConsulta = diasEntre(ordenadas[0].data, referencia);
    if (diasSemConsulta > intervalo) {
      adicionar('R2', 'Consulta preventiva', 'Agendar consulta de rotina', PARAMETROS.scoreConsultaPreventiva,
        'Pet ' + (pet.faseVida || 'sem fase informada') + ' está há ' + diasSemConsulta +
        ' dias sem consulta; referência usada: ' + intervalo + ' dias.',
        ['perfil', 'consultas', 'historicoClinico']);
    }
  }

  (dados.medicamentos || []).forEach((med) => {
    if (med.status === 'ativo' && med.retornoRecomendado && med.dataRetorno) {
      const atrasoRetorno = diasEntre(med.dataRetorno, referencia);
      if (atrasoRetorno > 0) {
        adicionar('R3', 'Retorno clínico', 'Agendar retorno do tratamento em andamento', PARAMETROS.scoreRetornoClinico,
          'Data de retorno registrada passou há ' + atrasoRetorno + ' dia(s).', ['medicamentos', 'historicoClinico']);
      }
    }
  });

  const variacao = dados.comportamento && Number(dados.comportamento.variacaoAtividadePercentual);
  if (dados.comportamento && dados.comportamento.variacaoAtividadePercentual !== null &&
      dados.comportamento.variacaoAtividadePercentual !== undefined &&
      !isNaN(variacao) && variacao <= PARAMETROS.limiarQuedaAtividadePct) {
    adicionar('R4', 'Avaliação veterinária', 'Sugerir avaliação por mudança de comportamento', PARAMETROS.scoreComportamento,
      'Atividade reduziu ' + Math.abs(variacao) + '% em relação ao padrão registrado.', ['comportamento', 'perfil']);
  }

  recomendacoes.sort((a, b) => b.score - a.score);

  return {
    pet: { id: pet.id, nome: pet.nome, especie: pet.especie, faseVida: pet.faseVida },
    abordagemIA: 'Motor de regras inteligentes',
    estrategiaPersonalizacao: 'Regras ajustadas por fase de vida e contexto individual do pet',
    totalRecomendacoes: recomendacoes.length,
    recomendacoes,
    geradoEm: new Date().toISOString(),
    aviso: AVISO,
  };
}

module.exports = { analisar, prioridade, intervaloConsulta, diasEntre, PARAMETROS, AVISO };
