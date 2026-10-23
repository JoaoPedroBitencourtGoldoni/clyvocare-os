# 🐾 ClyvoCare OS — Sistema de Saúde do Pet

> **IoT + MQTT + Inteligência Artificial para apoio ao cuidado preventivo de pets**  
> Protótipo acadêmico — FIAP · Disruptive Architectures: IoT, IoB & Generative IA  
> **Sprint 4:** IA implementada e integrada à aplicação (API + banco de dados + IoT + IA generativa com guardrails)

---

## 📋 Sumário

- [O Problema](#-o-problema)
- [A Solução](#-a-solução)
- [Sprint 4 — IA integrada à aplicação](#-sprint-4--ia-integrada-à-aplicação)
- [Componente de Inteligência Artificial](#-componente-de-inteligência-artificial)
- [Evidências Técnicas da IA](#-evidências-técnicas-da-ia)
- [Benefícios da IA](#-benefícios-da-ia)
- [Dados Utilizados pela IA](#-dados-utilizados-pela-ia)
- [Arquitetura de Integração](#️-arquitetura-de-integração)
- [Tecnologias](#️-tecnologias)
- [Componentes IoT](#-componentes-iot)
- [Como Executar](#-como-executar)
- [Como Executar — Sprint 4](#-como-executar--sprint-4-aplicação-com-ia-integrada)
- [Tópicos MQTT](#-tópicos-mqtt)
- [Estrutura do Repositório](#-estrutura-do-repositório)
- [Resultados Parciais](#-resultados-parciais)
- [Equipe](#-equipe)
- [Links](#-links)

---

## 🔴 O Problema

Durante a jornada contínua de cuidado do pet, diferentes informações são geradas, como perfil do animal, histórico clínico, vacinas, consultas, medicamentos e alterações de comportamento. O problema é que esses dados nem sempre são transformados em ações no momento adequado.

Entre os principais desafios estão:

- tutores podem esquecer vacinas, consultas e retornos clínicos;
- clínicas precisam acompanhar pendências e histórico de cada paciente;
- pets possuem necessidades diferentes de acordo com idade e fase de vida;
- alterações relevantes de comportamento podem passar despercebidas;
- informações clínicas isoladas dificultam a priorização dos próximos cuidados.

A proposta da IA no ClyvoCare OS é **analisar o contexto individual do pet e indicar quais ações de cuidado devem receber maior prioridade**, apoiando tutor e clínica na tomada de decisão.

---

## 💡 A Solução

O **ClyvoCare OS** integra IoT, MQTT, Node-RED e Inteligência Artificial para apoiar o acompanhamento preventivo do pet.

| Funcionalidade | Como funciona |
|---|---|
| 🌡️ Sensores IoT | ESP32 coleta temperatura, umidade, peso simulado e movimento |
| 📡 MQTT | HiveMQ realiza a comunicação entre ESP32 e Node-RED |
| 📊 Dashboard | Exibe os dados dos sensores e o status do pet |
| 💉 Calendário Vacinal | Verifica vacinas atrasadas ou próximas do vencimento |
| 🚨 Alertas | Identifica temperatura crítica e gera alerta |
| 🧠 Inteligência Artificial | Analisa dados do pet e gera recomendações priorizadas |

A Inteligência Artificial complementa o monitoramento ao transformar dados do pet em **recomendações personalizadas, priorizadas e justificadas**.

---

## 🚀 Sprint 4 — IA integrada à aplicação

Na Sprint 3 a IA foi especificada e demonstrada com dados simulados no Node-RED. Na **Sprint 4 ela foi implementada e integrada** a uma aplicação completa: interface web (tutor e clínica), API REST, banco de dados SQLite, dados IoT via MQTT e IA generativa. Tudo das Sprints 1–3 foi mantido; a Sprint 4 acrescenta a pasta `backend/` e arquivos complementares.

### O que foi entregue

| Entrega | Descrição | Onde |
|---|---|---|
| 🧠 **Motor de regras (IA especificada na Sprint 3)** | R1 vacina, R2 consulta por fase de vida, R3 retorno, R4 atividade; score, prioridade e motivo. Idêntico ao nó Node-RED original (teste diferencial) | `backend/src/ia/motorRegras.js` |
| ✨ **IA generativa com guardrails** | LLM explica as recomendações em linguagem natural (tutor × clínica); saída validada (anti-alucinação, sem diagnóstico/dose) e **fallback** determinístico | `explicador.js`, `guardrails.js`, `llmClient.js` |
| 💬 **Assistente conversacional** | Responde sobre vacinas, consultas, retorno, atividade e sensores com dados do pet; trata **emergências** e **recusa diagnóstico/medicação** | `chat.js` |
| 🗄️ **Banco de dados** | SQLite: tutores, pets, vacinas, consultas, tratamentos, leituras IoT, análises (auditoria), recomendações, feedback, conversas | `backend/src/db/` |
| 🔌 **API REST** | Aplicação ↔ API ↔ BD ↔ IA ([referência](docs/API.md)) | `backend/src/app.js` |
| 📡 **IoT → IA** | API assina o MQTT do ESP32; o sensor PIR gera a variação de atividade da regra R4 e as recomendações são publicadas em `clyvocare/ia/recomendacoes` | `services/iotService.js`, `ia/atividade.js` |
| 🖥️ **Aplicação web** | Tutor: cuidados priorizados, chat, sensores, registro de dados. Clínica: painel por prioridade, revisão humana, auditoria e métricas de adesão | `backend/public/index.html` |
| 🔁 **Node-RED integrado** | Flow complementar que consome a API e publica no MQTT (flow original intacto) | `node-red/clyvocare-nodered-flow-sprint4.json` |
| ✅ **Dados, testes e validação** | Validador de qualidade de dados, 16 cenários rotulados, **52 testes automatizados**, relatório de avaliação | `dados/`, `backend/tests/`, [`docs/RELATORIO-RESULTADOS.md`](docs/RELATORIO-RESULTADOS.md) |

### Arquitetura implementada

```mermaid
flowchart LR
    T[Tutor] --> APP[Aplicação web]
    C[Clínica] --> APP
    APP <-->|REST JSON| API[API Express]
    API <--> DB[(SQLite)]
    ESP[ESP32 / Wokwi] -->|MQTT| HIVE[HiveMQ]
    HIVE -->|assinatura| API
    API --> VAL[Validação de dados]
    VAL --> MOTOR[Motor de regras R1–R4]
    MOTOR --> GEN[IA generativa: explicação e chat]
    GEN --> GR{Guardrails}
    GR -->|aprovado| API
    GR -->|reprovado| TPL[Template determinístico] --> API
    API -->|clyvocare/ia/recomendacoes| HIVE
    HIVE --> NR[Node-RED]
    NR -->|HTTP| API
```

**Princípio de projeto:** *o motor de regras decide; o LLM apenas explica.* A decisão sobre o que priorizar é determinística e auditável; a IA generativa melhora a comunicação e nunca altera score ou ordem. Sem chave de LLM ou sem internet, o sistema opera normalmente em modo offline.

### Evidências (telas)

| Tutor — Thor com 4 recomendações, chat e IoT | Personalização — Mel (idosa) |
|---|---|
| ![Tutor](docs/evidencias/01-tutor-recomendacoes-thor.png) | ![Mel](docs/evidencias/02-tutor-personalizacao-mel-idosa.png) |

| Clínica — painel, revisão humana e métricas | Como a IA funciona |
|---|---|
| ![Clínica](docs/evidencias/03-clinica-painel-revisao.png) | ![IA](docs/evidencias/04-sobre-a-ia.png) |

### Resultados da avaliação (resumo)

| Métrica | Resultado |
|---|---|
| Cenários rotulados do motor | **16/16** (precisão e revocação 100% por regra) |
| Paridade com o nó Node-RED da Sprint 3 | **600/600** entradas aleatórias idênticas |
| Saídas inseguras de LLM simuladas bloqueadas | **10/10** (saída válida aceita) |
| Intenções e guardrails do assistente | **15/15** |
| Testes automatizados | **50/50** |
| Latência do pipeline offline | ~0,1 ms (sem rede) |

Detalhes e tabelas em [`docs/RELATORIO-RESULTADOS.md`](docs/RELATORIO-RESULTADOS.md). Contribuição para a personalização: o mesmo histórico (130 dias sem consulta) gera recomendação para **filhote** e **idoso**, mas não para **adulto**.

> Documentos da Sprint 4: [`docs/SPRINT4-IMPLEMENTACAO.md`](docs/SPRINT4-IMPLEMENTACAO.md) · [`docs/API.md`](docs/API.md) · [`docs/IA-GENERATIVA.md`](docs/IA-GENERATIVA.md) · [`docs/RELATORIO-RESULTADOS.md`](docs/RELATORIO-RESULTADOS.md)

---

## 🧠 Componente de Inteligência Artificial

### Abordagem adotada

Para a Sprint 3 foi adotado um **Motor de Regras Inteligentes**, abordagem prevista no enunciado da disciplina.

A escolha foi feita porque os dados utilizados pelo ClyvoCare são predominantemente estruturados e possuem critérios objetivos, como:

- datas de vacinas;
- intervalo entre consultas;
- fase de vida do pet;
- retorno de tratamentos;
- percentual de alteração de atividade.

Essa abordagem permite gerar recomendações **determinísticas, explicáveis e auditáveis**, sem exigir uma grande base histórica para treinamento. Cada recomendação apresenta score, prioridade, motivo e os dados utilizados na análise.

> O componente funciona como **apoio à tomada de decisão** e não realiza diagnóstico veterinário.

### Problema tratado pela IA

O Motor de Regras Inteligentes busca responder à pergunta:

> **Qual cuidado deve ser priorizado para este pet neste momento?**

As regras implementadas analisam:

1. **Vacinação** — identifica vacina atrasada e aumenta a prioridade conforme o atraso.
2. **Consulta preventiva** — considera o tempo desde a última consulta e a fase de vida do pet.
3. **Retorno clínico** — verifica tratamento ativo com retorno recomendado e data já ultrapassada.
4. **Comportamento** — identifica redução relevante no nível de atividade.

### Estratégia de personalização

A personalização utiliza o contexto individual de cada pet. A frequência de consulta preventiva, por exemplo, é ajustada pela fase de vida:

| Fase de vida | Referência utilizada |
|---|---:|
| Filhote | 90 dias |
| Adulto | 180 dias |
| Idoso | 120 dias |

Além da fase de vida, o motor considera vacinas, consultas, medicamentos, histórico clínico e comportamento do animal.

### Priorização

Cada recomendação recebe um **score**. O score é convertido em prioridade:

| Score | Prioridade |
|---:|---|
| 90 ou mais | ALTA |
| 60 a 89 | MÉDIA |
| Abaixo de 60 | BAIXA |

As recomendações são ordenadas do maior para o menor score.

### Regras e scores implementados

| Regra | Condição principal | Score | Personalização / justificativa |
|---|---|---:|---|
| Vacinação | Vacina atrasada | `min(100, 85 + min(diasAtraso,30)/2)` | Prioridade cresce com o atraso |
| Consulta preventiva | Intervalo acima da referência | `70` | Referência: filhote 90d, adulto 180d, idoso 120d |
| Retorno clínico | Tratamento ativo com retorno vencido | `90` | Usa tratamento e histórico individual |
| Comportamento | Queda de atividade `<= -30%` | `80` | Usa comportamento/IoT do próprio pet |

Os pesos e limiares são **heurísticos do protótipo acadêmico**. Em uma implantação real, devem ser calibrados e validados por profissionais veterinários.

### Fluxo lógico da IA

```text
Dados do Pet
     ↓
Motor de Regras Inteligentes
     ↓
Análise das condições individuais
     ↓
Cálculo de score
     ↓
Classificação de prioridade
     ↓
Recomendações personalizadas
```

### Demonstração implementada

O flow do Node-RED possui o nó **Dados do Pet — Demonstração IA**, que simula os dados que seriam enviados pela aplicação/API para o componente de IA.

O cenário utiliza o pet **Thor**, cão adulto, com:

- vacina de Raiva atrasada;
- retorno de tratamento pendente;
- redução de 35% no nível de atividade;
- intervalo de consulta preventiva acima da referência para um pet adulto.

A análise gera quatro recomendações ordenadas por prioridade.

### Exemplo de saída real do Motor de Regras

```json
{
  "pet": {
    "id": "pet-001",
    "nome": "Thor",
    "especie": "cao",
    "faseVida": "adulto"
  },
  "abordagemIA": "Motor de regras inteligentes",
  "estrategiaPersonalizacao": "Regras ajustadas por fase de vida e contexto individual do pet",
  "totalRecomendacoes": 4,
  "recomendacoes": [
    {
      "servico": "Vacinação",
      "acao": "Agendar reforço de Raiva",
      "score": 93,
      "prioridade": "ALTA",
      "motivo": "Raiva está atrasada há 16 dia(s).",
      "dadosUtilizados": ["vacinas", "perfil"]
    },
    {
      "servico": "Retorno clínico",
      "acao": "Agendar retorno do tratamento em andamento",
      "score": 90,
      "prioridade": "ALTA",
      "motivo": "Data de retorno registrada passou há 11 dia(s).",
      "dadosUtilizados": ["medicamentos", "historicoClinico"]
    },
    {
      "servico": "Avaliação veterinária",
      "acao": "Sugerir avaliação por mudança de comportamento",
      "score": 80,
      "prioridade": "MEDIA",
      "motivo": "Atividade reduziu 35% em relação ao padrão registrado.",
      "dadosUtilizados": ["comportamento", "perfil"]
    },
    {
      "servico": "Consulta preventiva",
      "acao": "Agendar consulta de rotina",
      "score": 70,
      "prioridade": "MEDIA",
      "dadosUtilizados": ["perfil", "consultas", "historicoClinico"]
    }
  ]
}
```

---

## 🔎 Evidências Técnicas da IA

Além do resumo deste README, a documentação técnica foi separada para facilitar a avaliação e a rastreabilidade:

| Documento / evidência | Conteúdo |
|---|---|
| [`docs/IA-ESPECIFICACAO.md`](docs/IA-ESPECIFICACAO.md) | problema, comparação de abordagens, regras, scoring, personalização, explicabilidade, guardrails e limitações |
| [`docs/ARQUITETURA-IA.md`](docs/ARQUITETURA-IA.md) | arquitetura, sequência e separação entre o que está implementado e o que é integração proposta |
| [`docs/DADOS-IA.md`](docs/DADOS-IA.md) | dicionário de entrada/saída, origem, tipos, utilização, qualidade e privacidade |
| [`docs/VALIDACAO-IA.md`](docs/VALIDACAO-IA.md) | casos de teste e resultados esperados para validar regras e limiares |
| [`examples/ia-input-thor.json`](examples/ia-input-thor.json) | exemplo reproduzível de entrada |
| [`examples/ia-output-thor.json`](examples/ia-output-thor.json) | exemplo de saída priorizada e explicável |

### Por que não foi usado LLM/modelo preditivo nesta etapa?

O Motor de Regras foi escolhido por adequação técnica: os dados atuais são estruturados, os critérios são objetivos e a Sprint não possui dataset clínico rotulado suficiente para treinar e validar um modelo preditivo. Um LLM poderia ser incorporado futuramente apenas para **explicar** resultados em linguagem natural, mantendo o motor determinístico como fonte dos fatos e utilizando guardrails para evitar orientação clínica livre.

---

## 🎯 Benefícios da IA

| Beneficiário | Valor gerado |
|---|---|
| **Tutor** | Recebe recomendações claras e priorizadas sobre os próximos cuidados do pet |
| **Clínica** | Identifica pendências e pacientes que precisam de acompanhamento com maior prioridade |
| **Pet** | Recebe acompanhamento preventivo mais adequado ao seu histórico e fase de vida |

---

## 📚 Dados Utilizados pela IA

Os dados foram organizados de forma estruturada para permitir análise pelo Motor de Regras Inteligentes.

| Dado | Origem | Estrutura / Exemplo | Utilização |
|---|---|---|---|
| Perfil do pet | Cadastro da aplicação | `id`, `nome`, `especie`, `idadeAnos`, `faseVida` | Personalizar regras e identificar o pet |
| Histórico clínico | Sistema da clínica | Array JSON com `data`, `tipo`, `observacao` | Fornecer contexto aos atendimentos |
| Vacinas | Cadastro e histórico | `nome`, `proximaDose`, `status` | Identificar vacina atrasada |
| Consultas | Histórico clínico | `data`, `tipo` | Calcular tempo desde a última consulta |
| Medicamentos / tratamentos | Histórico clínico | `nome`, `status`, `retornoRecomendado`, `dataRetorno` | Identificar retorno pendente |
| Comportamento | Tutor + IoT | `variacaoAtividadePercentual`, `origem` | Detectar alteração relevante de atividade |
| Sensores IoT | ESP32 | Temperatura, umidade, peso simulado e movimento | Monitoramento e apoio ao contexto do pet |

### Exemplo de entrada da IA

```json
{
  "dataReferencia": "2026-08-31",
  "perfil": {
    "id": "pet-001",
    "nome": "Thor",
    "especie": "cao",
    "idadeAnos": 3,
    "faseVida": "adulto"
  },
  "vacinas": [
    {
      "nome": "Raiva",
      "proximaDose": "2026-08-15",
      "status": "atrasada"
    }
  ],
  "consultas": [
    {
      "data": "2026-02-01",
      "tipo": "rotina"
    }
  ],
  "medicamentos": [
    {
      "nome": "Tratamento prescrito",
      "status": "ativo",
      "retornoRecomendado": true,
      "dataRetorno": "2026-08-20"
    }
  ],
  "comportamento": {
    "variacaoAtividadePercentual": -35,
    "origem": "PIR IoT + registro do tutor"
  }
}
```

---

## 🏗️ Arquitetura de Integração

A arquitetura abaixo representa como o componente de IA se integra à solução ClyvoCare. A aplicação, API e banco de dados representam a **arquitetura de integração proposta**. Na demonstração desta Sprint, os dados são simulados diretamente no Node-RED pelo nó **Dados do Pet — Demonstração IA**.

```mermaid
flowchart LR
    T[Tutor] --> APP[Aplicação ClyvoCare]
    C[Clínica] --> APP

    APP <--> API[API da Aplicação]
    API <--> DB[(Banco de Dados)]

    ESP[ESP32 / Wokwi] -->|MQTT| MQTT[HiveMQ Broker]
    MQTT --> NR[Node-RED]

    API -->|Perfil, histórico, vacinas, consultas, medicamentos e comportamento| NR
    NR --> IA[Motor de Regras Inteligentes]
    IA -->|Recomendações priorizadas| NR

    NR --> DASH[Dashboard / Alertas]
    NR -->|Recomendações| API
    API --> APP
```

### Fluxo de dados

1. Tutor e clínica utilizam a aplicação ClyvoCare.
2. A aplicação se comunica com a API.
3. A API registra e consulta informações no banco de dados.
4. O ESP32 envia os dados IoT por MQTT para o HiveMQ.
5. O Node-RED recebe e processa os dados dos sensores.
6. Os dados estruturados do pet são encaminhados ao Motor de Regras Inteligentes.
7. O motor aplica as regras, calcula os scores e ordena as recomendações.
8. As recomendações podem ser disponibilizadas à aplicação, tutor e clínica.

### Status da integração

> **Atualização Sprint 4:** a integração Aplicação ↔ API ↔ Banco de Dados ↔ IA, descrita abaixo como *arquitetura proposta* na Sprint 3, **foi implementada** (ver [Sprint 4](#-sprint-4--ia-integrada-à-aplicação)). O texto original da Sprint 3 foi preservado para registro.

Para não confundir **protótipo implementado** com **arquitetura de evolução**, a solução é apresentada em dois níveis:

- **Implementado e demonstrável nesta Sprint:** ESP32/Wokwi → MQTT/HiveMQ → Node-RED → processamento/alertas → Motor de Regras → Debug e publicação em `clyvocare/ia/recomendacoes`. A entrada clínica da IA é simulada pelo nó **Dados do Pet — Demonstração IA**.
- **Arquitetura proposta para continuidade:** Aplicação ↔ API ↔ Banco de Dados ↔ componente de IA, com persistência e apresentação das recomendações para tutor e clínica.

Essa distinção garante transparência sobre os resultados parciais sem superestimar a integração atual.

---

## 🛠️ Tecnologias

| Tecnologia | Uso no Projeto |
|---|---|
| **ESP32 (Wokwi)** | Simulação do dispositivo IoT e leitura dos sensores |
| **DHT22** | Temperatura e umidade |
| **Potenciômetro** | Simulação de peso |
| **PIR HC-SR501** | Movimento e atividade |
| **Buzzer** | Alerta sonoro em temperatura crítica |
| **MQTT (HiveMQ)** | Comunicação entre ESP32 e Node-RED |
| **Node-RED** | Orquestração dos fluxos, alertas, calendário vacinal e Motor de Regras |
| **Motor de Regras Inteligentes** | Personalização, priorização e recomendação de cuidados |
| **ArduinoJson** | Serialização dos dados do ESP32 |
| **HTML/CSS/JavaScript** | Dashboard web |
| **Node.js + Express** *(Sprint 4)* | API REST que integra aplicação, banco, IoT e IA |
| **SQLite (`node:sqlite`; `better-sqlite3` opcional)** *(Sprint 4)* | Banco de dados relacional com auditoria das análises, sem compilação nativa |
| **mqtt.js** *(Sprint 4)* | Assinatura dos sensores do ESP32 e publicação das recomendações |
| **LLM — Anthropic Messages API** *(Sprint 4)* | IA generativa para explicação e chat (opcional, com guardrails e fallback) |
| **node:test** *(Sprint 4)* | Testes automatizados (unitários, diferenciais e de integração) |

---

## ⚡ Componentes IoT

### Sensores e atuadores

| Componente | Pino ESP32 | Função |
|---|---|---|
| DHT22 | GPIO 4 | Temperatura e umidade |
| Potenciômetro | GPIO 34 (ADC) | Simulação de peso |
| PIR HC-SR501 | GPIO 18 | Movimento e atividade |
| Buzzer | GPIO 19 | Alerta sonoro |
| LED Verde | GPIO 2 | Status da conexão |
| LED Vermelho | GPIO 5 | Indicação de alerta crítico |

### Regra de alerta implementada

| Parâmetro | Condição | Resultado |
|---|---|---|
| Temperatura alta | `> 39.2°C` | Alerta de febre, LED vermelho e buzzer |
| Temperatura baixa | `< 37.5°C` e `> 20°C` | Alerta de hipotermia, LED vermelho e buzzer |

> Umidade, peso e movimento são monitorados e exibidos no dashboard. Nesta versão, o alerta automático implementado no firmware é baseado em temperatura.

---

## 🚀 Como Executar

### 1. Simular o ESP32 no Wokwi

Na pasta `firmware/` estão os arquivos utilizados pela simulação:

```text
firmware/
├── sketch.ino
├── diagram.json
├── libraries.txt
└── wokwi-project.txt
```

1. Acesse [wokwi.com](https://wokwi.com).
2. Crie ou abra um projeto ESP32.
3. Copie o conteúdo de `firmware/sketch.ino` para o `sketch.ino` do Wokwi.
4. Copie o conteúdo de `firmware/diagram.json` para o `diagram.json` do Wokwi.
5. Configure as bibliotecas conforme `firmware/libraries.txt`.
6. Clique em **Start Simulation**.
7. Acompanhe os dados no Serial Monitor.

O protótipo utiliza:

```text
Broker: broker.hivemq.com
Porta: 1883
```

### 2. Instalar e iniciar o Node-RED

```bash
npm install -g --unsafe-perm node-red
node-red
```

Acesse:

```text
http://localhost:1880
```

### 3. Instalar o dashboard do Node-RED

No Node-RED:

1. Menu → **Manage Palette**.
2. Selecione **Install**.
3. Procure por `node-red-dashboard`.
4. Instale a biblioteca.

### 4. Importar o flow

1. Abra o Node-RED.
2. Menu → **Import**.
3. Selecione:

```text
node-red/clyvocare-nodered-flow.json
```

4. Clique em **Import**.
5. Confirme o broker `broker.hivemq.com` na porta `1883`.
6. Clique em **Deploy**.

### 5. Testar os sensores

Com o Wokwi rodando, o Node-RED recebe os tópicos de temperatura, umidade, peso e movimento. O dashboard pode ser acessado em:

```text
http://localhost:1880/ui
```

Para testar o alerta crítico, altere a temperatura do DHT22 para um valor acima de `39.2°C`.

### 6. Testar o calendário vacinal

1. No Node-RED, abra a aba **Debug**.
2. Localize o nó **Verificação Vacinas (a cada hora)**.
3. Clique no botão do nó.
4. Observe os alertas gerados no Debug.

### 7. Testar a Inteligência Artificial

1. Abra a aba **Debug** do Node-RED.
2. Localize **Dados do Pet — Demonstração IA**.
3. Clique no botão do nó.
4. Os dados passam pelo **Motor de Regras Inteligentes**.
5. Observe no Debug as recomendações, scores, prioridades e justificativas.

O resultado também é publicado no tópico MQTT:

```text
clyvocare/ia/recomendacoes
```

---

## ▶️ Como Executar — Sprint 4 (aplicação com IA integrada)

**Requisitos:** Node.js **22.13 ou superior** (recomendado) e npm. O banco SQLite é o que vem embutido no Node (`node:sqlite`): **não há nada para compilar**. Em Node 18.18–22.12 o `npm install` instala o `better-sqlite3` como alternativa opcional.

```bash
cd backend
npm install
npm start
```

Abra **http://localhost:3000**. O banco SQLite é criado e populado automaticamente (Thor, Luna, Mel e Bolt).

| Opção | Como |
|---|---|
| Sem internet / sem LLM | `MQTT_ENABLED=false npm start` (modo offline com templates) |
| Habilitar IA generativa | `ANTHROPIC_API_KEY=sua_chave npm start` (modelo configurável em `CLYVO_LLM_MODEL`) |
| Conectar o ESP32/Wokwi | Deixe o Wokwi rodando; a API assina `clyvocare/esp32/*` no HiveMQ e grava as leituras para o pet `IOT_PET_ID` (padrão `pet-001`) |
| Contêiner (opcional) | `docker compose up --build` |

Variáveis de ambiente: [`backend/.env.example`](backend/.env.example).

### Roteiro de demonstração (≈ 3 min)

1. Na aba **Tutor**, mantenha a data **31/08/2026** e selecione **Thor** → 4 recomendações (Vacinação 93, Retorno 90, Avaliação 80, Consulta 70), idênticas à Sprint 3.
2. Clique em **Marcar aplicada** na vacina de Raiva → a recomendação R1 desaparece (dado → banco → IA).
3. Clique em **Simular queda de atividade (−35%)** → R4 recalculada com origem *PIR IoT (ESP32)*.
4. No **assistente**: “Como estão as vacinas?”, “Qual remédio posso dar?” (recusa segura) e “meu cachorro está convulsionando” (orientação de emergência).
5. Troque para **Mel (idosa)** → consulta preventiva por 128 dias (limite do idoso: 120).
6. Na aba **Clínica** → painel por prioridade, **aprovar/rejeitar** recomendações, auditoria e métricas.

### Node-RED (integração)

Importe `node-red/clyvocare-nodered-flow-sprint4.json` (além do flow original) com o backend rodando. Os injects consultam a API, exibem o resultado no Debug e publicam em `clyvocare/ia/recomendacoes`.

### Testes e avaliação

```bash
cd backend
npm test            # 52 testes: regras, paridade com Sprint 3, validação, IoT, LLM/guardrails, chat, API+BD
npm run avaliar     # gera docs/RELATORIO-RESULTADOS.md (cenários rotulados, guardrails, latência)
npm run verificar-entrega   # checklist antes de gerar o .zip
```

---

## 📡 Tópicos MQTT

| Tópico | Direção | Payload | Descrição |
|---|---|---|---|
| `clyvocare/esp32/temperatura` | ESP32 → Node-RED | Número | Temperatura em °C |
| `clyvocare/esp32/umidade` | ESP32 → Node-RED | Número | Umidade em % |
| `clyvocare/esp32/peso` | ESP32 → Node-RED | Número | Peso simulado em kg |
| `clyvocare/esp32/movimento` | ESP32 → Node-RED | `0` ou `1` | Estado do sensor PIR |
| `clyvocare/esp32/status` | ESP32 → MQTT | JSON | Estado completo do dispositivo |
| `clyvocare/alertas/critico` | ESP32 / Node-RED → MQTT | JSON | Alerta de temperatura crítica |
| `clyvocare/alertas/vacinas` | Node-RED → MQTT | JSON | Alertas do calendário vacinal |
| `clyvocare/ia/recomendacoes` | Node-RED → MQTT | JSON | Recomendações personalizadas e priorizadas pela IA |

### Exemplo de status publicado pelo ESP32

```json
{
  "device": "clyvocare-esp32-001",
  "temperatura": 38.4,
  "umidade": 72.1,
  "peso": 12.3,
  "movimento": 1,
  "timestamp": 45230,
  "versao": "1.0.0"
}
```

---

## 📁 Estrutura do Repositório

```text
clyvocare-os/
│
├── firmware/                         # Sprint 2 — ESP32 / Wokwi
│   ├── sketch.ino
│   ├── diagram.json
│   ├── libraries.txt
│   └── wokwi-project.txt
│
├── node-red/
│   ├── clyvocare-nodered-flow.json            # Sprints 2/3 (original, intacto)
│   └── clyvocare-nodered-flow-sprint4.json    # Sprint 4 — integração com a API de IA
│
├── dashboard/
│   └── clyvocare-dashboard.html               # Sprints 2/3 (original, intacto)
│
├── backend/                          # Sprint 4 — API, banco, IA e aplicação web
│   ├── src/
│   │   ├── ia/                       # motorRegras, validador, atividade (IoT), explicador (LLM),
│   │   │                             # guardrails, chat, llmClient, fase
│   │   ├── db/                       # schema.sql, database.js, seed.js
│   │   ├── services/                 # contexto, recomendacaoService, iotService (MQTT)
│   │   ├── app.js · server.js · config.js
│   ├── public/                       # index.html (tutor/clínica) e dashboard-iot.html
│   ├── tests/                        # 52 testes automatizados
│   ├── scripts/                      # avaliar.js · verificar-entrega.js
│   ├── Dockerfile · .env.example · package.json
│
├── dados/
│   └── cenarios-validacao.json       # Sprint 4 — 16 cenários rotulados
│
├── docs/
│   ├── IA-ESPECIFICACAO.md · ARQUITETURA-IA.md · DADOS-IA.md · VALIDACAO-IA.md   # Sprint 3
│   ├── SPRINT4-IMPLEMENTACAO.md · API.md · IA-GENERATIVA.md                      # Sprint 4
│   ├── RELATORIO-RESULTADOS.md                                                   # Sprint 4
│   └── evidencias/                   # capturas de tela da aplicação
│
├── examples/
│   ├── ia-input-thor.json
│   └── ia-output-thor.json
│
├── Github/Link Github.txt
├── Video/Link Video.txt
├── docker-compose.yml · package.json · .gitignore
└── README.md
```

O `.zip` de entrega não precisa conter a pasta `.git/`; o histórico permanece no GitHub e a remoção deixa o pacote final mais limpo.

---

## 📊 Resultados Parciais

### ✅ Implementado

- [x] ESP32 simulado no Wokwi.
- [x] Leitura de temperatura e umidade com DHT22.
- [x] Peso simulado com potenciômetro.
- [x] Detecção de movimento com PIR.
- [x] Comunicação MQTT utilizando HiveMQ.
- [x] Processamento dos dados pelo Node-RED.
- [x] Dashboard Node-RED com dados dos sensores.
- [x] Alerta crítico de temperatura com LED e buzzer.
- [x] Verificação de calendário vacinal.
- [x] Motor de Regras Inteligentes.
- [x] Personalização por fase de vida e contexto individual.
- [x] Priorização de recomendações por score.
- [x] Recomendação de vacinação, retorno clínico, avaliação e consulta preventiva.
- [x] Publicação das recomendações em MQTT.
- [x] Demonstração funcional simulada do componente de IA.
- [x] Documentação técnica da abordagem e justificativa de escolha.
- [x] Dicionário de dados de entrada e saída da IA.
- [x] Plano de validação com casos de teste e resultados esperados.
- [x] Separação explícita entre integração implementada e arquitetura proposta.

### ✅ Sprint 4 — implementado

- [x] Motor de regras extraído para módulo e idêntico ao nó Node-RED da Sprint 3 (teste diferencial).
- [x] Banco de dados SQLite com perfil, histórico, vacinas, consultas, tratamentos, IoT, análises, feedback e conversas.
- [x] API REST integrando aplicação, banco, IoT e IA.
- [x] Validação da qualidade dos dados de entrada (datas, fase de vida, consistência, contexto insuficiente).
- [x] IoT → IA: sensor PIR via MQTT gera a variação de atividade da regra R4.
- [x] IA generativa (LLM) para explicação e chat, com guardrails anti-alucinação e fallback determinístico.
- [x] Assistente conversacional com tratamento de emergência e recusa de diagnóstico/medicação.
- [x] Aplicação web para tutor (cuidados, chat, sensores, registro) e clínica (painel, revisão humana, métricas).
- [x] Feedback do tutor, revisão clínica e trilha de auditoria de cada execução da IA.
- [x] Flow Node-RED complementar consumindo a API e publicando em MQTT.
- [x] 52 testes automatizados e relatório de avaliação reproduzível.
- [x] Documentação técnica, referência da API, evidências em tela e roteiro do vídeo pitch.

---

## 👥 Equipe

| Nome | RM |
|---|---:|
| Felipe Maglio Filho | 563512 |
| João Pedro Bitencourt Goldoni | 564339 |
| Marina Tamagnini Magalhães | 561786 |
| Mateus Granja dos Santos | 564930 |
| Vitória Valentina Maglio | 563509 |

---

## 🎬 Links

- 💻 **Repositório:** https://github.com/JoaoPedroBitencourtGoldoni/clyvocare-os
- 📺 **Vídeo Pitch Sprint 4:** https://youtu.be/Z8Mz_eGe6Iw
- 📺 **Vídeo Pitch Sprint 3:** https://youtu.be/xaL6Z8EyFxg
- 🖥️ **Aplicação (local):** `http://localhost:3000`
- 🐾 **Dashboard Node-RED:** `http://localhost:1880/ui`
- 🐾 **Dashboard Web:** `dashboard/clyvocare-dashboard.html`

---

*Projeto desenvolvido para a disciplina **Disruptive Architectures: IoT, IoB & Generative IA — FIAP 2026**.*
