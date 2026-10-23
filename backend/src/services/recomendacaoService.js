'use strict';
const { montarContexto } = require('./contexto');
const { validarContexto } = require('../ia/validador');
const { analisar } = require('../ia/motorRegras');
const { explicar } = require('../ia/explicador');

class ErroNegocio extends Error {
  constructor(status, mensagem, detalhes) { super(mensagem); this.status = status; this.detalhes = detalhes; }
}

async function gerarRecomendacoes(db, petId, { dataReferencia, publico = 'tutor', explicarTexto = true, persistir = true, llm = null, publicar = null, agora = new Date() } = {}) {
  const ref = dataReferencia || agora.toISOString().slice(0, 10);
  const contexto = montarContexto(db, petId, ref, { agora });
  if (!contexto) throw new ErroNegocio(404, 'Pet não encontrado');

  const qualidade = validarContexto(contexto);
  if (!qualidade.valido) throw new ErroNegocio(422, 'Dados do pet inválidos para análise', qualidade.erros);

  const analise = analisar(contexto, { agora });
  const exp = explicarTexto
    ? await explicar(analise, { publico, llm, dataReferencia: ref })
    : { resumo: null, explicacoes: [], geracao: { modo: 'nenhum', validacao: { aprovado: true, motivos: [] } } };

  const resultado = {
    ...analise,
    dataReferencia: ref,
    publico,
    resumo: exp.resumo,
    geracao: exp.geracao,
    qualidadeDados: { avisos: qualidade.avisos, regrasNaoAvaliadas: qualidade.regrasNaoAvaliadas },
    contextoComportamento: contexto.comportamento || null,
  };
  resultado.recomendacoes = analise.recomendacoes.map((r, i) => ({ ...r, explicacao: exp.explicacoes[i] || null }));

  if (persistir) {
    const tx = db.transaction(() => {
      const a = db.prepare('INSERT INTO analises (pet_id, data_referencia, gerado_em, publico, modo_explicacao, contexto_json, saida_json) VALUES (?,?,?,?,?,?,?)')
        .run(petId, ref, analise.geradoEm, publico, exp.geracao.modo, JSON.stringify(contexto), JSON.stringify(resultado));
      resultado.analiseId = Number(a.lastInsertRowid);
      const ins = db.prepare('INSERT INTO recomendacoes (analise_id, pet_id, regra, servico, acao, score, prioridade, motivo, explicacao) VALUES (?,?,?,?,?,?,?,?,?)');
      resultado.recomendacoes.forEach((r) => {
        r.id = Number(ins.run(resultado.analiseId, petId, r.regra, r.servico, r.acao, r.score, r.prioridade, r.motivo, r.explicacao).lastInsertRowid);
      });
    });
    tx();
  }

  if (publicar) {
    resultado.publicadoMQTT = publicar('clyvocare/ia/recomendacoes', {
      pet: resultado.pet, abordagemIA: resultado.abordagemIA, totalRecomendacoes: resultado.totalRecomendacoes,
      recomendacoes: resultado.recomendacoes.map(({ explicacao, ...r }) => r), geradoEm: resultado.geradoEm, aviso: resultado.aviso,
    });
  }
  return resultado;
}

module.exports = { gerarRecomendacoes, ErroNegocio };
