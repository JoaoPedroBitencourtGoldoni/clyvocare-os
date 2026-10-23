'use strict';
const path = require('path');

module.exports = {
  porta: Number(process.env.PORT || 3000),
  dbPath: process.env.CLYVO_DB_PATH || path.join(__dirname, '..', 'data', 'clyvocare.db'),
  dataDemo: '2026-08-31',
  mqtt: {
    habilitado: (process.env.MQTT_ENABLED || 'true') === 'true',
    url: process.env.MQTT_URL || 'mqtt://broker.hivemq.com:1883',
    clientId: process.env.MQTT_CLIENT_ID || 'clyvocare-api-sprint4-' + Math.random().toString(16).slice(2, 8),
    petIotPadrao: process.env.IOT_PET_ID || 'pet-001',
    topicos: {
      temperatura: 'clyvocare/esp32/temperatura',
      umidade: 'clyvocare/esp32/umidade',
      peso: 'clyvocare/esp32/peso',
      movimento: 'clyvocare/esp32/movimento',
      recomendacoes: 'clyvocare/ia/recomendacoes',
    },
  },
  llm: {
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    modelo: process.env.CLYVO_LLM_MODEL || 'claude-sonnet-4-6',
    url: process.env.ANTHROPIC_API_URL || 'https://api.anthropic.com/v1/messages',
    timeoutMs: Number(process.env.CLYVO_LLM_TIMEOUT_MS || 20000),
  },
};
