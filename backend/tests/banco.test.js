'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { novoBanco, AGORA } = require('./helpers');
const { montarContexto } = require('../src/services/contexto');
const { registrarLeitura, simularLeituras } = require('../src/services/iotService');
const { calcularFaseVida } = require('../src/ia/fase');
const thorIn = require('../../examples/ia-input-thor.json');

test('contexto montado a partir do SQLite equivale à entrada documentada na Sprint 3 (examples/ia-input-thor.json)', () => {
  const db = novoBanco();
  const c = montarContexto(db, 'pet-001', '2026-08-31', { agora: AGORA });
  const limpa = (arr, campos) => arr.map((o) => Object.fromEntries(campos.map((k) => [k, o[k]])));
  assert.deepEqual(c.perfil, thorIn.perfil);
  assert.deepEqual(limpa(c.vacinas, ['nome', 'proximaDose', 'status']), thorIn.vacinas);
  assert.deepEqual(c.consultas, thorIn.consultas);
  assert.deepEqual(limpa(c.medicamentos, ['status', 'retornoRecomendado', 'dataRetorno']), thorIn.medicamentos.map(({ nome, ...r }) => r));
  assert.equal(c.comportamento.variacaoAtividadePercentual, thorIn.comportamento.variacaoAtividadePercentual);
  assert.equal(montarContexto(db, 'inexistente', '2026-08-31'), null);
});
test('restrições do esquema e integridade referencial', () => {
  const db = novoBanco();
  assert.throws(() => db.prepare("INSERT INTO pets (id,tutor_id,nome,especie,idade_anos,fase_vida) VALUES ('x','tutor-001','a','coelho',1,'adulto')").run());
  assert.throws(() => db.prepare("INSERT INTO vacinas (pet_id,nome,proxima_dose) VALUES ('nao-existe','V','2026-01-01')").run());
  assert.throws(() => registrarLeitura(db, 'pet-001', 'pulso', 1));
  assert.throws(() => registrarLeitura(db, 'pet-001', 'peso', 'abc'));
  db.prepare("DELETE FROM pets WHERE id = 'pet-001'").run();
  assert.equal(db.prepare("SELECT COUNT(*) n FROM vacinas WHERE pet_id='pet-001'").get().n, 0);
});
test('simulador IoT é determinístico e exato', () => {
  const db = novoBanco();
  const r = simularLeituras(db, 'pet-001', { perfil: 'queda', agora: AGORA.getTime() });
  assert.equal(r.atividadeEsperadaPct, 39);
  assert.equal(db.prepare("SELECT COUNT(*) n FROM leituras_iot WHERE tipo='movimento'").get().n, 100);
  assert.equal(simularLeituras(db, 'inexistente'), null);
});
test('fase de vida por espécie e idade', () => {
  assert.equal(calcularFaseVida('cao', 0.5), 'filhote'); assert.equal(calcularFaseVida('cao', 3), 'adulto');
  assert.equal(calcularFaseVida('cao', 7), 'idoso'); assert.equal(calcularFaseVida('gato', 9), 'adulto');
  assert.equal(calcularFaseVida('gato', 10), 'idoso'); assert.equal(calcularFaseVida('cao', -1), null);
});
