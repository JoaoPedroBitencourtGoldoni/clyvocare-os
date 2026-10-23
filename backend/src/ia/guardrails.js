'use strict';

const NUMERO = /\d+(?:[.,]\d+)?/g;

const PADROES_PROIBIDOS = [
  { id: 'diagnostico', re: /\b(diagn[oó]stic(?:o|ad[oa])\s+(?:[eé]|de|:)|(?:ele|ela|o pet|seu (?:c[aã]o|gato)|o animal)\s+(?:tem|est[aá] com|sofre de|apresenta)\s+(?:uma?\s+)?(?:doen[cç]a|infec[cç][aã]o|c[aâ]ncer|verminose|depress[aã]o|diabetes|insufici[eê]ncia|artrose|artrite|parvovirose|cinomose|leptospirose))/i },
  { id: 'prescricao', re: /\b(receit(?:o|e|ar)\b|prescrev|administr(?:e|ar)\b|d[eê] (?:ao|ao seu) (?:pet|c[aã]o|gato)|aumente a dose|dose de\b)/i },
  { id: 'dosagem', re: /\b\d+(?:[.,]\d+)?\s?(?:mg|mcg|ml|gotas?|comprimidos?|c[aá]psulas?)\b/i },
  { id: 'dispensar_veterinario', re: /(n[aã]o (?:precisa|[eé] necess[aá]rio) (?:de |ir ao |levar ao )?veterin|dispensa (?:a )?(?:consulta|veterin)|n[aã]o se preocupe)/i },
  { id: 'promessa', re: /(com certeza (?:absoluta )?(?:est[aá]|[eé])|garanto|100% seguro|sem riscos?)/i },
];

function numerosDe(texto) {
  return (String(texto).match(NUMERO) || []).map((n) => n.replace(',', '.'));
}

function numerosPermitidos(fatos) {
  return new Set(numerosDe(JSON.stringify(fatos)));
}

function validarTextoGerado(textos, fatos) {
  const motivos = [];
  const lista = Array.isArray(textos) ? textos : [textos];
  const permitidos = numerosPermitidos(fatos);
  lista.forEach((t, i) => {
    if (typeof t !== 'string' || t.trim().length === 0) { motivos.push('texto_vazio[' + i + ']'); return; }
    if (t.length > 700) motivos.push('texto_longo[' + i + ']');
    for (const p of PADROES_PROIBIDOS) if (p.re.test(t)) motivos.push(p.id + '[' + i + ']');
    const inventados = numerosDe(t).filter((n) => !permitidos.has(n));
    if (inventados.length) motivos.push('numero_nao_fundamentado[' + i + ']:' + inventados.join('|'));
  });
  return { aprovado: motivos.length === 0, motivos };
}

function extrairJSON(texto) {
  if (typeof texto !== 'string') return null;
  const limpo = texto.replace(/```json|```/g, '');
  const ini = limpo.indexOf('{');
  const fim = limpo.lastIndexOf('}');
  if (ini < 0 || fim <= ini) return null;
  try { return JSON.parse(limpo.slice(ini, fim + 1)); } catch (_) { return null; }
}

const EMERGENCIA = /(convuls|engasg|sangr|hemorrag|envenen|intoxic|atropel|n[aã]o (?:est[aá] )?respir|desmai|inconsciente|vomit(?:ando)? (?:sangue|muito)|n[aã]o consegue (?:levantar|respirar)|paralis|queimadura grave)/i;
const PEDE_DIAGNOSTICO = /(o que (?:ele|ela|o meu|meu|minha) .{0,25}tem\b|qual (?:[eé] )?(?:a )?doen[cç]a|diagn[oó]stic|ser[aá] que (?:[eé]|e) (?:uma?|doen)|[eé] grave\??$|ele est[aá] doente|ela est[aá] doente)/i;
const PEDE_MEDICACAO = /(que (?:rem[eé]dio|medicamento|dose)|qual (?:[eé] )?(?:a |o )?(?:rem[eé]dio|medicamento|dose)|posso (?:dar|tomar|administrar)|quanto (?:de )?(?:rem[eé]dio|dose|mg|ml)|dosagem|receita)/i;

module.exports = { validarTextoGerado, extrairJSON, numerosPermitidos, numerosDe, PADROES_PROIBIDOS, EMERGENCIA, PEDE_DIAGNOSTICO, PEDE_MEDICACAO };
