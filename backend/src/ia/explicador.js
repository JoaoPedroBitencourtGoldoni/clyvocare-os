'use strict';
const { validarTextoGerado, extrairJSON } = require('./guardrails');

const SYSTEM_EXPLICADOR = [
  'Você é o assistente de comunicação do ClyvoCare OS, um sistema de apoio ao cuidado preventivo de pets.',
  'Sua única tarefa é reescrever, em português do Brasil e linguagem natural, recomendações JÁ CALCULADAS por um motor de regras.',
  'REGRAS OBRIGATÓRIAS:',
  '1. Use SOMENTE os fatos fornecidos. Não invente datas, números, doenças, vacinas ou medicamentos.',
  '2. NUNCA faça diagnóstico, prescreva medicamento, cite dose ou diga que não é preciso ir ao veterinário.',
  '3. Não altere scores, prioridades nem a ordem das recomendações.',
  '4. Para o público "tutor": tom acolhedor, simples, sem jargão. Para "clinica": tom técnico e objetivo.',
  '5. Cada explicação deve ter no máximo 2 frases e citar o motivo.',
  '6. Responda APENAS com JSON válido no formato: {"resumo":"...","explicacoes":["...", "..."]} com uma explicação por recomendação, na mesma ordem.',
].join('\n');

function montarFatos(analise, dataReferencia) {
  return {
    dataReferencia,
    pet: { nome: analise.pet.nome, especie: analise.pet.especie, faseVida: analise.pet.faseVida },
    totalRecomendacoes: analise.totalRecomendacoes,
    recomendacoes: analise.recomendacoes.map((r, i) => ({
      indice: i + 1, servico: r.servico, acao: r.acao, score: r.score, prioridade: r.prioridade, motivo: r.motivo,
    })),
  };
}

const ESPECIE = { cao: 'cão', gato: 'gato' };
const minuscula1 = (t) => (t ? t.charAt(0).toLowerCase() + t.slice(1) : t);

function explicarPorTemplate(analise, publico) {
  const { pet, recomendacoes } = analise;
  const nome = pet.nome || 'o pet';
  const fase = pet.faseVida ? ' ' + pet.faseVida : '';
  const altas = recomendacoes.filter((r) => r.prioridade === 'ALTA').length;

  if (publico === 'clinica') {
    const resumo = recomendacoes.length === 0
      ? 'Paciente ' + nome + ' (' + (ESPECIE[pet.especie] || pet.especie) + fase + '): sem pendências identificadas pelas regras R1–R4.'
      : 'Paciente ' + nome + ' (' + (ESPECIE[pet.especie] || pet.especie) + fase + '): ' + recomendacoes.length + ' pendência(s), ' + altas + ' de prioridade ALTA. Sugere-se revisão profissional.';
    return { resumo, explicacoes: recomendacoes.map((r) => r.regra + ' · score ' + r.score + ' (' + r.prioridade + '): ' + r.motivo + ' Ação sugerida: ' + r.acao + '.') };
  }

  const resumo = recomendacoes.length === 0
    ? 'Ótima notícia: com base no histórico de ' + nome + ', não encontrei nenhum cuidado pendente agora. Continue acompanhando e mantenha as consultas de rotina.'
    : 'Analisei o histórico de ' + nome + ' e encontrei ' + recomendacoes.length + ' cuidado(s) que merecem atenção, do mais ao menos prioritário. O primeiro da lista é: ' + minuscula1(recomendacoes[0].acao) + '. Estas indicações apoiam sua decisão e não substituem a avaliação do veterinário.';
  const porRegra = {
    R1: (r) => r.motivo + ' Manter a vacinação em dia protege ' + nome + '. Sugestão: ' + minuscula1(r.acao) + '.',
    R2: (r) => r.motivo + ' Uma consulta de rotina ajuda a acompanhar a saúde de ' + nome + ' com antecedência.',
    R3: (r) => r.motivo + ' O retorno permite ao veterinário avaliar como ' + nome + ' está respondendo ao tratamento.',
    R4: (r) => r.motivo + ' Isso não significa que há uma doença, mas vale conversar com o veterinário sobre a mudança.',
  };
  return { resumo, explicacoes: recomendacoes.map((r) => (porRegra[r.regra] || ((x) => x.motivo))(r)) };
}

async function explicar(analise, { publico = 'tutor', llm = null, dataReferencia } = {}) {
  const inicio = Date.now();
  const template = explicarPorTemplate(analise, publico);
  const meta = (extra) => ({ latenciaMs: Date.now() - inicio, ...extra });

  if (analise.recomendacoes.length === 0 && !llm) {
    return { ...template, geracao: meta({ modo: 'template', validacao: { aprovado: true, motivos: [] } }) };
  }
  if (!llm) {
    return { ...template, geracao: meta({ modo: 'template', validacao: { aprovado: true, motivos: [] }, fallbackMotivo: 'LLM não configurado (modo offline)' }) };
  }

  const fatos = montarFatos(analise, dataReferencia);
  try {
    const bruto = await llm.gerar({
      system: SYSTEM_EXPLICADOR,
      user: 'Público: ' + publico + '\nFatos (calculados pelo motor de regras):\n' + JSON.stringify(fatos, null, 2),
    });
    const json = extrairJSON(bruto);
    if (!json || typeof json.resumo !== 'string' || !Array.isArray(json.explicacoes)) {
      return { ...template, geracao: meta({ modo: 'template', modelo: llm.modelo, validacao: { aprovado: false, motivos: ['formato_invalido'] }, fallbackMotivo: 'Resposta do LLM fora do formato esperado' }) };
    }
    if (json.explicacoes.length !== analise.recomendacoes.length) {
      return { ...template, geracao: meta({ modo: 'template', modelo: llm.modelo, validacao: { aprovado: false, motivos: ['quantidade_divergente'] }, fallbackMotivo: 'Quantidade de explicações diferente da de recomendações' }) };
    }
    const validacao = validarTextoGerado([json.resumo, ...json.explicacoes], fatos);
    if (!validacao.aprovado) {
      return { ...template, geracao: meta({ modo: 'template', modelo: llm.modelo, validacao, fallbackMotivo: 'Guardrails reprovaram o texto do LLM' }) };
    }
    return { resumo: json.resumo.trim(), explicacoes: json.explicacoes.map((t) => t.trim()), geracao: meta({ modo: 'llm', modelo: llm.modelo, validacao }) };
  } catch (e) {
    return { ...template, geracao: meta({ modo: 'template', modelo: llm.modelo, validacao: { aprovado: false, motivos: ['erro_llm'] }, fallbackMotivo: 'Falha ao consultar o LLM: ' + e.message }) };
  }
}

module.exports = { explicar, explicarPorTemplate, montarFatos, SYSTEM_EXPLICADOR };
