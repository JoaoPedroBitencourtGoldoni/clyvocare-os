'use strict';
const config = require('./config');
const { abrirBanco } = require('./db/database');
const { popular } = require('./db/seed');
const { criarClienteLLM } = require('./ia/llmClient');
const { iniciarMQTT, limparLeiturasAntigas } = require('./services/iotService');
const { criarApp } = require('./app');

const db = abrirBanco(config.dbPath);
if (popular(db)) console.log('[db] banco populado com dados de demonstração');
limparLeiturasAntigas(db);

const llm = criarClienteLLM(config.llm);
const mqtt = iniciarMQTT({ db, config });
const app = criarApp({ db, config, llm, mqtt });

app.listen(config.porta, () => {
  console.log('ClyvoCare OS — Sprint 4');
  console.log('  Aplicação:  http://localhost:' + config.porta);
  console.log('  API:        http://localhost:' + config.porta + '/api/saude');
  console.log('  IA gen.:    ' + (llm ? 'LLM ' + llm.modelo + ' (com guardrails)' : 'modo offline (template) — defina ANTHROPIC_API_KEY para habilitar o LLM'));
  console.log('  MQTT:       ' + (config.mqtt.habilitado ? config.mqtt.url : 'desabilitado'));
});
