'use strict';
const mqtt = require('mqtt');

const TIPOS = ['temperatura', 'umidade', 'peso', 'movimento'];

function registrarLeitura(db, petId, tipo, valor, ts = Date.now()) {
  if (!TIPOS.includes(tipo)) throw new Error('Tipo de leitura inválido: ' + tipo);
  const v = Number(valor);
  if (!isFinite(v)) throw new Error('Valor de leitura inválido');
  db.prepare('INSERT INTO leituras_iot (pet_id, tipo, valor, ts) VALUES (?,?,?,?)').run(petId, tipo, v, ts);
}

function limparLeiturasAntigas(db, dias = 7) {
  return db.prepare('DELETE FROM leituras_iot WHERE ts < ?').run(Date.now() - dias * 86400000).changes;
}

function simularLeituras(db, petId, { perfil = 'normal', amostras = 100, agora = Date.now(), janelaHoras = 24 } = {}) {
  const pet = db.prepare('SELECT baseline_atividade_pct AS b FROM pets WHERE id = ?').get(petId);
  if (!pet) return null;
  const baseline = pet.b || 50;
  const razao = (perfil === 'queda' ? baseline * 0.65 : baseline) / 100;
  const ativas = Math.round(razao * amostras);
  const passo = (janelaHoras * 3600 * 1000) / amostras;
  const tx = db.transaction(() => {
    db.prepare("DELETE FROM leituras_iot WHERE pet_id = ? AND tipo = 'movimento'").run(petId);
    for (let i = 0; i < amostras; i++) {
      const ativo = Math.floor(((i + 1) * ativas) / amostras) > Math.floor((i * ativas) / amostras) ? 1 : 0;
      registrarLeitura(db, petId, 'movimento', ativo, Math.round(agora - (amostras - 1 - i) * passo));
    }
    registrarLeitura(db, petId, 'temperatura', 38.4, agora);
    registrarLeitura(db, petId, 'umidade', 72.1, agora);
    registrarLeitura(db, petId, 'peso', 12.3, agora);
  });
  tx();
  return { perfil, amostras, atividadeEsperadaPct: Math.round((ativas / amostras) * 1000) / 10 };
}

function iniciarMQTT({ db, config, log = console }) {
  const estado = { conectado: false, mensagensRecebidas: 0, ultimaMensagem: null, erro: null };
  if (!config.mqtt.habilitado) return { estado: () => ({ ...estado, habilitado: false }), publicar: () => false, fechar: () => {} };

  const client = mqtt.connect(config.mqtt.url, { clientId: config.mqtt.clientId, reconnectPeriod: 5000, connectTimeout: 8000 });
  const porTopico = {};
  for (const t of TIPOS) porTopico[config.mqtt.topicos[t]] = t;

  client.on('connect', () => {
    estado.conectado = true; estado.erro = null;
    client.subscribe(Object.keys(porTopico), (e) => e && log.warn('[mqtt] erro ao assinar', e.message));
    log.log('[mqtt] conectado a ' + config.mqtt.url);
  });
  client.on('close', () => { estado.conectado = false; });
  client.on('error', (e) => { estado.erro = e.message; });
  client.on('message', (topic, payload) => {
    const tipo = porTopico[topic];
    if (!tipo) return;
    try {
      registrarLeitura(db, config.mqtt.petIotPadrao, tipo, payload.toString());
      estado.mensagensRecebidas++; estado.ultimaMensagem = new Date().toISOString();
    } catch (e) { log.warn('[mqtt] mensagem ignorada em ' + topic + ': ' + e.message); }
  });

  return {
    estado: () => ({ ...estado, habilitado: true, url: config.mqtt.url }),
    publicar: (topic, obj) => { if (!client.connected) return false; client.publish(topic, JSON.stringify(obj)); return true; },
    fechar: () => client.end(true),
  };
}

module.exports = { registrarLeitura, simularLeituras, iniciarMQTT, limparLeiturasAntigas, TIPOS };
