'use strict';
function criarClienteLLM(cfg, fetchImpl) {
  if (!cfg || !cfg.apiKey) return null;
  const doFetch = fetchImpl || globalThis.fetch;
  return {
    modelo: cfg.modelo,
    async gerar({ system, user, maxTokens = 900 }) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), cfg.timeoutMs || 20000);
      try {
        const resp = await doFetch(cfg.url, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-api-key': cfg.apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: cfg.modelo, max_tokens: maxTokens, temperature: 0.2, system, messages: [{ role: 'user', content: user }] }),
          signal: ctrl.signal,
        });
        if (!resp.ok) throw new Error('LLM HTTP ' + resp.status);
        const data = await resp.json();
        return (data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
      } finally { clearTimeout(t); }
    },
  };
}

module.exports = { criarClienteLLM };
