'use strict';
const config = require('../config');
const { abrirBanco } = require('./database');

function popular(db) {
  const jaTem = db.prepare('SELECT COUNT(*) AS n FROM pets').get().n;
  if (jaTem > 0) return false;

  const tx = db.transaction(() => {
    db.prepare('INSERT INTO tutores (id, nome) VALUES (?,?)').run('tutor-001', 'Tutor Demo');
    db.prepare('INSERT INTO tutores (id, nome) VALUES (?,?)').run('tutor-002', 'Tutora Demo 2');

    const pet = db.prepare('INSERT INTO pets (id, tutor_id, nome, especie, idade_anos, fase_vida, baseline_atividade_pct) VALUES (?,?,?,?,?,?,?)');
    const vac = db.prepare('INSERT INTO vacinas (pet_id, nome, proxima_dose, intervalo_dias) VALUES (?,?,?,?)');
    const con = db.prepare('INSERT INTO consultas (pet_id, data, tipo) VALUES (?,?,?)');
    const his = db.prepare('INSERT INTO historico_clinico (pet_id, data, tipo, observacao) VALUES (?,?,?,?)');
    const med = db.prepare('INSERT INTO medicamentos (pet_id, nome, status, retorno_recomendado, data_retorno) VALUES (?,?,?,?,?)');
    const comp = db.prepare('INSERT INTO comportamento_tutor (pet_id, variacao_atividade_pct, observacao) VALUES (?,?,?)');

    pet.run('pet-001', 'tutor-001', 'Thor', 'cao', 3, 'adulto', 60);
    vac.run('pet-001', 'Raiva', '2026-08-15', 365);
    vac.run('pet-001', 'V10', '2027-01-10', 365);
    con.run('pet-001', '2026-02-01', 'rotina');
    his.run('pet-001', '2026-03-10', 'consulta', 'acompanhamento de rotina');
    med.run('pet-001', 'Tratamento prescrito', 'ativo', 1, '2026-08-20');
    comp.run('pet-001', -35, 'Tutor percebeu o Thor mais quieto nos passeios');

    pet.run('pet-002', 'tutor-001', 'Luna', 'gato', 0.5, 'filhote', 55);
    vac.run('pet-002', 'Tríplice Felina', '2026-09-05', 30);
    con.run('pet-002', '2026-06-20', 'rotina');
    his.run('pet-002', '2026-06-20', 'consulta', 'primeira consulta e vermifugação');
    comp.run('pet-002', 5, null);

    pet.run('pet-003', 'tutor-002', 'Mel', 'cao', 9, 'idoso', 40);
    vac.run('pet-003', 'Raiva', '2027-03-01', 365);
    vac.run('pet-003', 'V10', '2027-02-10', 365);
    con.run('pet-003', '2026-04-25', 'rotina');
    his.run('pet-003', '2026-04-25', 'consulta', 'check-up geriátrico');
    comp.run('pet-003', -10, null);

    pet.run('pet-004', 'tutor-002', 'Bolt', 'cao', 4, 'adulto', 65);
    vac.run('pet-004', 'Raiva', '2027-05-20', 365);
    vac.run('pet-004', 'V10', '2027-04-02', 365);
    con.run('pet-004', '2026-07-15', 'rotina');
    his.run('pet-004', '2026-07-15', 'consulta', 'check-up de rotina sem alterações');
    comp.run('pet-004', 3, null);
  });
  tx();
  return true;
}

module.exports = { popular };

if (require.main === module) {
  const reset = process.argv.includes('--reset');
  if (reset) {
    const fs = require('fs');
    for (const suf of ['', '-wal', '-shm']) { try { fs.unlinkSync(config.dbPath + suf); } catch (_) {  } }
  }
  const db = abrirBanco(config.dbPath);
  console.log(popular(db) ? 'Banco populado: ' + config.dbPath : 'Banco já possuía dados.');
}
