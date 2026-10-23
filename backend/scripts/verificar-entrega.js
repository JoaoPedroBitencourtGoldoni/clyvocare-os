'use strict';
const fs = require('fs');
const path = require('path');
const raiz = path.join(__dirname, '..', '..');
const ler = (p) => { try { return fs.readFileSync(path.join(raiz, p), 'utf8'); } catch (_) { return null; } };
const falhas = []; const avisos = [];
const ok = (c, msg) => { console.log((c ? '✅ ' : '❌ ') + msg); if (!c) falhas.push(msg); };

const obrigatorios = ['README.md', 'Github/Link Github.txt', 'Video/Link Video.txt', 'backend/src/app.js', 'backend/src/ia/motorRegras.js', 'backend/src/ia/explicador.js',
  'backend/src/ia/guardrails.js', 'backend/src/ia/chat.js', 'backend/src/db/schema.sql', 'backend/public/index.html', 'backend/tests/api.test.js', 'dados/cenarios-validacao.json',
  'node-red/clyvocare-nodered-flow.json', 'node-red/clyvocare-nodered-flow-sprint4.json', 'firmware/sketch.ino', 'dashboard/clyvocare-dashboard.html',
  'docs/IA-ESPECIFICACAO.md', 'docs/RELATORIO-RESULTADOS.md', 'docs/API.md', 'docs/IA-GENERATIVA.md', 'docs/evidencias/01-tutor-recomendacoes-thor.png'];
obrigatorios.forEach((f) => ok(fs.existsSync(path.join(raiz, f)), 'arquivo presente: ' + f));

const video = ler('Video/Link Video.txt') || '';
const yt = video.match(/https:\/\/(?:youtu\.be\/|www\.youtube\.com\/watch\?v=)[\w-]+/g) || [];
ok(!/PREENCHER|COLE_AQUI/i.test(video) && yt.length > 0, 'Video/Link Video.txt contém o link do YouTube da Sprint 4 (não listado)');
ok(/github\.com\/[\w-]+\/[\w.-]+/.test(ler('Github/Link Github.txt') || ''), 'Github/Link Github.txt contém o link do repositório');
const readme = ler('README.md') || '';
ok(!/PREENCHER|COLE_AQUI/i.test(readme), 'README.md sem marcadores pendentes (PREENCHER)');
ok(['Como Executar', 'Tecnologias', 'Resultados'].every((s) => readme.includes(s)), 'README com instruções de uso, tecnologias e resultados');
ok(!fs.existsSync(path.join(raiz, 'backend', 'node_modules')) || (avisos.push('backend/node_modules existe: não inclua no .zip'), true), 'node_modules não será enviado (confira ao gerar o .zip)');
ok(!fs.existsSync(path.join(raiz, 'backend', 'data', 'clyvocare.db')) || (avisos.push('backend/data/clyvocare.db existe: não inclua no .zip'), true), 'banco local não será enviado (confira ao gerar o .zip)');
avisos.forEach((a) => console.log('⚠️  ' + a));
console.log(falhas.length ? '\n' + falhas.length + ' pendência(s) antes da entrega.' : '\nTudo certo para gerar o .zip!');
process.exit(falhas.length ? 1 : 0);
