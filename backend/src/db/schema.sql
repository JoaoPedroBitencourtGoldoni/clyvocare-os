PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tutores (
  id        TEXT PRIMARY KEY,
  nome      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS pets (
  id                    TEXT PRIMARY KEY,
  tutor_id              TEXT NOT NULL REFERENCES tutores(id),
  nome                  TEXT NOT NULL,
  especie               TEXT NOT NULL CHECK (especie IN ('cao','gato')),
  idade_anos            REAL NOT NULL,
  fase_vida             TEXT NOT NULL CHECK (fase_vida IN ('filhote','adulto','idoso')),
  baseline_atividade_pct REAL
);

CREATE TABLE IF NOT EXISTS vacinas (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id         TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  nome           TEXT NOT NULL,
  proxima_dose   TEXT NOT NULL,
  intervalo_dias INTEGER NOT NULL DEFAULT 365
);

CREATE TABLE IF NOT EXISTS consultas (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id  TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  data    TEXT NOT NULL,
  tipo    TEXT NOT NULL DEFAULT 'rotina'
);

CREATE TABLE IF NOT EXISTS historico_clinico (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id      TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  data        TEXT NOT NULL,
  tipo        TEXT NOT NULL,
  observacao  TEXT
);

CREATE TABLE IF NOT EXISTS medicamentos (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id               TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  nome                 TEXT NOT NULL,
  status               TEXT NOT NULL CHECK (status IN ('ativo','concluido')),
  retorno_recomendado  INTEGER NOT NULL DEFAULT 0,
  data_retorno         TEXT
);

CREATE TABLE IF NOT EXISTS comportamento_tutor (
  id                     INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id                 TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  variacao_atividade_pct REAL NOT NULL,
  observacao             TEXT,
  criado_em              TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leituras_iot (
  id      INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id  TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  tipo    TEXT NOT NULL CHECK (tipo IN ('temperatura','umidade','peso','movimento')),
  valor   REAL NOT NULL,
  ts      INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leituras ON leituras_iot (pet_id, tipo, ts);

CREATE TABLE IF NOT EXISTS analises (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id          TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  data_referencia TEXT NOT NULL,
  gerado_em       TEXT NOT NULL,
  publico         TEXT NOT NULL,
  modo_explicacao TEXT NOT NULL,
  contexto_json   TEXT NOT NULL,
  saida_json      TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recomendacoes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  analise_id       INTEGER NOT NULL REFERENCES analises(id) ON DELETE CASCADE,
  pet_id           TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  regra            TEXT NOT NULL,
  servico          TEXT NOT NULL,
  acao             TEXT NOT NULL,
  score            REAL NOT NULL,
  prioridade       TEXT NOT NULL,
  motivo           TEXT NOT NULL,
  explicacao       TEXT,
  feedback         TEXT,
  feedback_em      TEXT,
  revisao_clinica  TEXT,
  revisao_em       TEXT
);

CREATE TABLE IF NOT EXISTS conversas (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  pet_id      TEXT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  papel       TEXT NOT NULL,
  texto       TEXT NOT NULL,
  intencao    TEXT,
  modo        TEXT,
  criado_em   TEXT NOT NULL DEFAULT (datetime('now'))
);
