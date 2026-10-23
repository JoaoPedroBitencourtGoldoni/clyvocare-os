'use strict';
const { validarTextoGerado, extrairJSON, EMERGENCIA, PEDE_DIAGNOSTICO, PEDE_MEDICACAO } = require('./guardrails');
const { diasEntre, intervaloConsulta, PARAMETROS } = require('./motorRegras');

const sem = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const INTENCOES = [
  { id: 'saudacao', re: /^(oi|ola|bom dia|boa tarde|boa noite|e ai|hey|hello)\b/ },
  { id: 'como_funciona', re: /(como (voce )?(funciona|calcula|decide|chegou)|por que (voce )?(recomend|sugere)|o que e (o )?score|como e (feita|calculada) (a )?prioridade|explica(r)? (a )?(ia|recomendac))/ },
  { id: 'vacinas', re: /(vacin|reforco|raiva|v10|triplice|imuniza)/ },
  { id: 'consulta', re: /(consulta|check.?up|veterinari[oa] (de rotina)?|ultima visita|quando levar)/ },
  { id: 'retorno', re: /(retorno|tratamento|medicac|remedio)/ },
  { id: 'atividade', re: /(atividade|comportamento|quiet[oa]|agitad|energia|desanimad|apatic|brincando|passeio)/ },
  { id: 'sensores', re: /(temperatura|febre|umidade|peso|sensor|iot|esp32|movimento|colar|monitor)/ },
  { id: 'proximos_cuidados', re: /(proxim[oa]s? (cuidado|passo|acao)|o que (devo|preciso|fazer)|pendenc|prioridade|prioritari|alerta|resumo|como (esta|anda)|situacao|tudo certo|urgente)/ },
  { id: 'ajuda', re: /(ajuda|o que voce (faz|pode)|menu|opcoes)/ },
];

function classificar(mensagem) {
  const t = sem(mensagem).trim();
  for (const i of INTENCOES) if (i.re.test(t)) return i.id;
  return 'desconhecida';
}

const SUGESTOES = ['Quais são os próximos cuidados?', 'Como estão as vacinas?', 'Como está a atividade?', 'Quando foi a última consulta?', 'Como você calcula as prioridades?'];

function listaRecs(analise, filtro) {
  return analise.recomendacoes.filter((r) => !filtro || filtro(r));
}

function respostaDeterministica(intencao, { contexto, analise, leituras, publico }) {
  const nome = contexto.perfil.nome;
  const ref = new Date(contexto.dataReferencia);
  const fontes = [];
  let texto;

  switch (intencao) {
    case 'saudacao':
      texto = 'Olá! Sou o assistente do ClyvoCare e posso ajudar com os próximos cuidados de ' + nome + ': vacinas, consultas, retornos e atividade. O que você quer saber?';
      break;
    case 'ajuda':
      texto = 'Posso responder sobre os próximos cuidados, vacinas, consulta de rotina, retorno de tratamento, atividade e sensores de ' + nome + '. Também explico como calculo as prioridades. Não faço diagnóstico nem indico medicamentos: isso é papel do veterinário.';
      break;
    case 'proximos_cuidados': {
      fontes.push('recomendacoes');
      if (analise.recomendacoes.length === 0) { texto = nome + ' não tem nenhum cuidado pendente nas regras de vacina, consulta, retorno e atividade. Siga com a rotina de acompanhamento.'; break; }
      const top = analise.recomendacoes.slice(0, 3).map((r, i) => (i + 1) + ') ' + r.acao + ' — prioridade ' + r.prioridade + ' (score ' + r.score + '). ' + r.motivo).join('\n');
      texto = 'Estes são os cuidados prioritários de ' + nome + ':\n' + top;
      break;
    }
    case 'vacinas': {
      fontes.push('vacinas');
      const linhas = contexto.vacinas.map((v) => '• ' + v.nome + ': próxima dose em ' + v.proximaDose + ' (' + (v.status === 'atrasada' ? 'ATRASADA há ' + diasEntre(v.proximaDose, ref) + ' dia(s)' : 'em dia') + ')');
      texto = linhas.length ? 'Calendário vacinal de ' + nome + ':\n' + linhas.join('\n') : 'Não há vacinas cadastradas para ' + nome + '.';
      break;
    }
    case 'consulta': {
      fontes.push('consultas', 'perfil');
      if (!contexto.consultas.length) { texto = 'Não há consultas registradas para ' + nome + '. Vale agendar uma avaliação de rotina.'; break; }
      const ult = contexto.consultas[0];
      const dias = diasEntre(ult.data, ref);
      const lim = intervaloConsulta(contexto.perfil.faseVida);
      texto = 'A última consulta de ' + nome + ' foi em ' + ult.data + ' (há ' + dias + ' dias). Para um pet ' + contexto.perfil.faseVida + ', a referência do sistema é de ' + lim + ' dias entre consultas de rotina — ' + (dias > lim ? 'por isso recomendo agendar uma nova.' : 'ainda dentro do prazo.');
      break;
    }
    case 'retorno': {
      fontes.push('medicamentos');
      const ativos = contexto.medicamentos.filter((m) => m.status === 'ativo');
      if (!ativos.length) { texto = nome + ' não possui tratamento ativo registrado.'; break; }
      texto = ativos.map((m) => {
        if (!m.retornoRecomendado || !m.dataRetorno) return '• ' + m.nome + ': ativo, sem retorno registrado.';
        const atraso = diasEntre(m.dataRetorno, ref);
        return '• ' + m.nome + ': retorno previsto para ' + m.dataRetorno + (atraso > 0 ? ' — já passou há ' + atraso + ' dia(s); recomendo agendar com a clínica.' : ' — dentro do prazo.');
      }).join('\n');
      break;
    }
    case 'atividade': {
      fontes.push('comportamento');
      const c = contexto.comportamento;
      if (!c) { texto = 'Ainda não há dado de atividade de ' + nome + ' (nem do sensor PIR nem registrado por você).'; break; }
      const v = Number(c.variacaoAtividadePercentual);
      texto = 'A atividade de ' + nome + ' variou ' + (v > 0 ? '+' : '') + v + '% em relação ao padrão (fonte: ' + c.origem + '). ' +
        (v <= PARAMETROS.limiarQuedaAtividadePct ? 'É uma queda relevante; sugiro conversar com o veterinário. Isso não é um diagnóstico.' : 'Está dentro do esperado.');
      break;
    }
    case 'sensores': {
      fontes.push('sensores IoT');
      const partes = [];
      if (leituras.temperatura) partes.push('temperatura ' + leituras.temperatura.valor + ' °C');
      if (leituras.umidade) partes.push('umidade ' + leituras.umidade.valor + '%');
      if (leituras.peso) partes.push('peso ' + leituras.peso.valor + ' kg');
      if (leituras.movimento) partes.push('movimento ' + (leituras.movimento.valor === 1 ? 'ativo' : 'inativo'));
      if (!partes.length) { texto = 'Ainda não recebi leituras do ESP32 para ' + nome + '. Quando o dispositivo enviar dados via MQTT, eles aparecerão aqui.'; break; }
      texto = 'Últimas leituras do dispositivo de ' + nome + ': ' + partes.join(', ') + '.';
      const t = leituras.temperatura && leituras.temperatura.valor;
      if (t !== undefined && (t > 39.2 || (t < 37.5 && t > 20))) texto += ' A temperatura está fora da faixa de referência do sistema (37.5–39.2 °C); recomendo contato com o veterinário.';
      break;
    }
    case 'como_funciona':
      fontes.push('regras');
      texto = 'Uso um motor de regras explicável: ' +
        'R1 vacina atrasada (score 85 a 100, cresce com o atraso); R2 consulta de rotina além do intervalo da fase de vida (filhote ' + PARAMETROS.intervaloConsultaDias.filhote + ' dias, adulto ' + PARAMETROS.intervaloConsultaDias.adulto + ', idoso ' + PARAMETROS.intervaloConsultaDias.idoso + '); ' +
        'R3 retorno de tratamento vencido (score 90); R4 queda de atividade de 30% ou mais (score 80). Score 90+ é prioridade ALTA e de 60 a 89, MÉDIA. A IA generativa apenas explica o resultado em linguagem natural.';
      break;
    default:
      texto = 'Não tenho certeza se entendi. Posso ajudar com próximos cuidados, vacinas, consultas, retorno de tratamento, atividade e sensores de ' + nome + '.';
  }
  return { texto, fontes };
}

const SYSTEM_CHAT = [
  'Você é o assistente conversacional do ClyvoCare OS. Reescreva a RESPOSTA BASE de forma natural e acolhedora em português do Brasil.',
  'REGRAS: use somente os fatos da resposta base; não acrescente números, datas ou informações novas; nunca diagnostique, prescreva ou cite dose;',
  'não diga que o veterinário é desnecessário; mantenha no máximo 4 frases curtas (listas podem ser mantidas).',
  'Responda APENAS com JSON: {"resposta":"..."}.',
].join(' ');

async function responderChat({ mensagem, publico = 'tutor', contexto, analise, leituras = {}, llm = null }) {
  const inicio = Date.now();
  const t = sem(mensagem);
  const nome = contexto.perfil.nome;

  if (!mensagem || !String(mensagem).trim()) {
    return { resposta: 'Pode escrever sua dúvida sobre ' + nome + '.', intencao: 'vazia', modo: 'regra', fontes: [], sugestoes: SUGESTOES, latenciaMs: 0 };
  }
  if (EMERGENCIA.test(t) || EMERGENCIA.test(mensagem)) {
    return { resposta: 'Isso pode ser uma EMERGÊNCIA. Procure imediatamente um veterinário ou pronto-socorro veterinário 24h; não espere uma recomendação do sistema. Se possível, ligue antes para a clínica e informe os sintomas.', intencao: 'emergencia', modo: 'guardrail', fontes: [], alerta: 'emergencia', sugestoes: [], latenciaMs: Date.now() - inicio };
  }
  if (PEDE_MEDICACAO.test(t) || PEDE_MEDICACAO.test(mensagem)) {
    return { resposta: 'Não posso indicar medicamentos nem doses: isso exige avaliação do veterinário, que conhece o quadro de ' + nome + '. Posso ajudar a organizar o retorno ou a próxima consulta — quer ver os cuidados prioritários?', intencao: 'recusa_medicacao', modo: 'guardrail', fontes: [], alerta: 'fora_do_escopo', sugestoes: ['Quais são os próximos cuidados?'], latenciaMs: Date.now() - inicio };
  }
  if (PEDE_DIAGNOSTICO.test(t) || PEDE_DIAGNOSTICO.test(mensagem)) {
    return { resposta: 'Eu não faço diagnóstico: só o veterinário pode avaliar o que ' + nome + ' tem. O que posso fazer é mostrar os sinais que o sistema já monitora (vacinas, retorno, atividade e sensores) para você levar à consulta.', intencao: 'recusa_diagnostico', modo: 'guardrail', fontes: [], alerta: 'fora_do_escopo', sugestoes: ['Como está a atividade?', 'Quais são os próximos cuidados?'], latenciaMs: Date.now() - inicio };
  }

  const intencao = classificar(mensagem);
  const base = respostaDeterministica(intencao, { contexto, analise, leituras, publico });
  let resposta = base.texto;
  let modo = 'regra';
  let validacao;

  if (llm && intencao !== 'desconhecida') {
    try {
      const fatos = { dataReferencia: contexto.dataReferencia, pet: { nome, faseVida: contexto.perfil.faseVida }, respostaBase: base.texto };
      const bruto = await llm.gerar({ system: SYSTEM_CHAT, user: 'Pergunta do usuário: ' + mensagem + '\nRESPOSTA BASE:\n' + base.texto, maxTokens: 500 });
      const json = extrairJSON(bruto);
      if (json && typeof json.resposta === 'string') {
        validacao = validarTextoGerado([json.resposta], fatos);
        if (validacao.aprovado) { resposta = json.resposta.trim(); modo = 'llm'; }
      }
    } catch (_) {  }
  }

  return { resposta, intencao, modo, modelo: modo === 'llm' ? llm.modelo : undefined, validacao, fontes: base.fontes, sugestoes: SUGESTOES, latenciaMs: Date.now() - inicio };
}

module.exports = { responderChat, classificar, respostaDeterministica, SUGESTOES };
