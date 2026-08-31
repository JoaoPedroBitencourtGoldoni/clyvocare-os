# 🐾 ClyvoCare OS — Sistema de Saúde do Pet

> **IoT + MQTT + IA para saúde preventiva de pets**
> Protótipo acadêmico — FIAP · Disruptive Architectures: IoT, IoB & Generative IA

---

## 📋 Sumário

* [O Problema](#-o-problema)
* [A Solução](#-a-solução)
* [Componente de Inteligência Artificial](#-componente-de-inteligência-artificial)
* [Dados Utilizados pela IA](#-dados-utilizados-pela-ia)
* [Arquitetura](#️-arquitetura)
* [Tecnologias](#️-tecnologias)
* [Componentes IoT](#-componentes-iot)
* [Como Executar](#-como-executar)
* [Tópicos MQTT](#-tópicos-mqtt)
* [Estrutura do Repositório](#-estrutura-do-repositório)
* [Resultados Parciais](#-resultados-parciais)
* [Equipe](#-equipe)
* [Links](#-links)

---

## 🔴 O Problema

Durante a jornada de cuidado do pet, diversas informações importantes são geradas, como histórico clínico, vacinas, consultas, medicamentos e alterações de comportamento.

O problema é que essas informações nem sempre são transformadas em ações no momento correto.

Entre os principais desafios estão:

* Tutores podem esquecer datas de vacinas e consultas.
* Clínicas precisam acompanhar o histórico e as pendências de cada paciente.
* Pets possuem necessidades diferentes de acordo com idade e fase de vida.
* Alterações de comportamento podem passar despercebidas.
* Informações clínicas precisam ser analisadas de forma conjunta para apoiar a continuidade do cuidado.

---

## 💡 A Solução

O **ClyvoCare OS** é uma solução que integra IoT, MQTT, Node-RED e Inteligência Artificial para apoiar o acompanhamento contínuo da saúde do pet.

| Funcionalidade             | Como funciona                                              |
| -------------------------- | ---------------------------------------------------------- |
| 🌡️ Sensores IoT           | ESP32 coleta informações e envia os dados via MQTT          |
| 📊 Dashboard               | Interface para visualização dos dados e alertas            |
| 💉 Calendário Vacinal      | Identifica vacinas próximas do vencimento ou atrasadas     |
| 🧠 Inteligência Artificial | Analisa os dados do pet e gera recomendações priorizadas   |
| 🔔 Alertas                 | Informa situações que precisam de atenção                  |
| 🏥 Histórico Clínico       | Centraliza informações utilizadas no acompanhamento do pet |

A Inteligência Artificial complementa a solução transformando os dados disponíveis em recomendações personalizadas para tutores e clínicas.

---

## 🧠 Componente de Inteligência Artificial

Para a Sprint 3 foi adotado um **Motor de Regras Inteligentes**.

Essa abordagem foi escolhida porque os dados disponíveis no ClyvoCare são predominantemente estruturados, como datas de vacinas, consultas, tratamentos, fase de vida e informações de comportamento.

O motor analisa essas informações e gera recomendações com níveis de prioridade.

### Problema tratado pela IA

O componente de IA busca identificar quais cuidados devem ser priorizados para cada pet.

Entre as situações analisadas estão:

* Vacinas atrasadas ou próximas do vencimento.
* Retornos clínicos pendentes.
* Alterações relevantes de comportamento.
* Intervalo desde a última consulta preventiva.
* Fase de vida do animal.

### Funcionamento

O fluxo básico da análise é:

```text
Dados do Pet
      ↓
Motor de Regras Inteligentes
      ↓
Análise das condições
      ↓
Cálculo de Score
      ↓
Classificação de prioridade
      ↓
Recomendações personalizadas
```

Cada situação identificada recebe uma pontuação.

As recomendações são então ordenadas de acordo com sua prioridade, permitindo que tutor e clínica visualizem primeiro os cuidados que precisam de maior atenção.

### Exemplo de resultado

Para um pet com vacina atrasada, retorno clínico pendente e alteração de comportamento, o sistema pode produzir:

```json
{
  "pet": "Thor",
  "recomendacoes": [
    {
      "tipo": "VACINA",
      "prioridade": "ALTA",
      "score": 93,
      "acao": "Agendar reforço da vacina contra Raiva"
    },
    {
      "tipo": "RETORNO_CLINICO",
      "prioridade": "ALTA",
      "score": 90,
      "acao": "Agendar retorno clínico"
    },
    {
      "tipo": "COMPORTAMENTO",
      "prioridade": "MEDIA",
      "score": 80,
      "acao": "Avaliar alteração no nível de atividade"
    },
    {
      "tipo": "CONSULTA_PREVENTIVA",
      "prioridade": "MEDIA",
      "score": 70,
      "acao": "Agendar consulta preventiva"
    }
  ]
}
```

O componente funciona como **apoio à tomada de decisão** e não realiza diagnóstico veterinário.

---

## 📚 Dados Utilizados pela IA

A Inteligência Artificial utiliza dados relacionados ao histórico e ao contexto individual de cada pet.

| Dado                       | Origem                | Utilização                                     |
| -------------------------- | --------------------- | ---------------------------------------------- |
| Perfil do pet              | Cadastro da aplicação | Identificação de espécie, idade e fase de vida |
| Histórico clínico          | Sistema da clínica    | Contexto dos atendimentos realizados           |
| Vacinas                    | Cadastro e histórico  | Verificação de vacinas atrasadas ou próximas   |
| Consultas                  | Histórico clínico     | Identificação do intervalo entre atendimentos  |
| Medicamentos e tratamentos | Histórico clínico     | Verificação de tratamentos e retornos          |
| Comportamento              | Tutor e sensores      | Identificação de mudanças relevantes           |
| Atividade                  | Sensores IoT          | Apoio à análise do comportamento               |

### Personalização

As recomendações são personalizadas de acordo com as características e o histórico de cada animal.

A fase de vida, por exemplo, pode alterar a frequência esperada de acompanhamento preventivo.

Assim, pets diferentes podem receber recomendações diferentes mesmo sendo avaliados pelo mesmo motor de regras.

---

## 🏗️ Arquitetura

```text
┌─────────────────────────────────────────────────────────────────┐
│                         ClyvoCare OS                             │
│                                                                 │
│   ┌──────────────┐                         ┌──────────────────┐  │
│   │ Tutor /      │                         │      Clínica     │  │
│   │ Aplicação    │                         │                  │  │
│   └──────┬───────┘                         └────────┬─────────┘  │
│          │                                          │            │
│          └──────────────────┬───────────────────────┘            │
│                             ↓                                    │
│                       ┌───────────┐                              │
│                       │ Aplicação │                              │
│                       │ / API     │                              │
│                       └─────┬─────┘                              │
│                             │                                    │
│                  ┌──────────┴──────────┐                         │
│                  ↓                     ↓                         │
│            ┌───────────┐      ┌────────────────────┐             │
│            │ Banco de  │      │ Motor de Regras   │             │
│            │ Dados     │      │ Inteligentes      │             │
│            └───────────┘      └─────────┬──────────┘             │
│                                        │                        │
│                                        ↓                        │
│                              Recomendações priorizadas           │
│                                                                 │
│   ┌──────────┐     MQTT      ┌──────────┐                        │
│   │ ESP32    │ ────────────► │ HiveMQ   │                        │
│   │ Wokwi    │               │ Broker   │                        │
│   └──────────┘               └────┬─────┘                        │
│                                   │                              │
│                                   ↓                              │
│                              ┌──────────┐                        │
│                              │ Node-RED │                        │
│                              └────┬─────┘                        │
│                                   │                              │
│                                   ↓                              │
│                           Dashboard / Alertas                    │
└─────────────────────────────────────────────────────────────────┘
```

### Fluxo de dados

1. O tutor e a clínica utilizam a aplicação ClyvoCare.
2. Os dados do pet são registrados e consultados pela aplicação.
3. As informações são armazenadas no banco de dados.
4. Os sensores IoT enviam dados do ESP32 por MQTT.
5. O HiveMQ recebe as mensagens.
6. O Node-RED processa e organiza os dados e alertas.
7. Os dados necessários são enviados ao Motor de Regras Inteligentes.
8. A IA analisa as informações e gera recomendações priorizadas.
9. As recomendações são disponibilizadas para tutor e clínica.

---

## 🛠️ Tecnologias

| Tecnologia                       | Uso no Projeto                                        |
| -------------------------------- | ----------------------------------------------------- |
| **ESP32 (Wokwi)**                | Microcontrolador responsável pela coleta dos sensores |
| **DHT22**                        | Coleta de temperatura e umidade                       |
| **Potenciômetro**                | Simulação de leitura relacionada ao peso              |
| **PIR HC-SR501**                 | Detecção de movimento e atividade                     |
| **Buzzer**                       | Alerta sonoro                                         |
| **MQTT (HiveMQ)**                | Comunicação entre os componentes IoT                  |
| **Node-RED**                     | Orquestração dos fluxos, processamento e regras       |
| **Motor de Regras Inteligentes** | Análise e priorização das recomendações               |
| **ArduinoJson**                  | Serialização dos dados do ESP32                       |
| **HTML/CSS/JavaScript**          | Dashboard web                                         |

---

## ⚡ Componentes IoT

### Sensores utilizados

| Sensor        | Pino ESP32    | Função                |
| ------------- | ------------- | --------------------- |
| DHT22         | GPIO 4        | Temperatura e umidade |
| Potenciômetro | GPIO 34 (ADC) | Simulação de peso     |
| PIR HC-SR501  | GPIO 18       | Movimento e atividade |
| Buzzer        | GPIO 19       | Alerta sonoro         |
| LED Verde     | GPIO 2        | Status da conexão     |
| LED Vermelho  | GPIO 5        | Indicação de alerta   |

### Parâmetros de alerta

| Parâmetro   | Faixa Normal            | Alerta               |
| ----------- | ----------------------- | -------------------- |
| Temperatura | 37.5°C – 39.2°C         | < 37.5°C ou > 39.2°C |
| Umidade     | 40% – 75%               | > 75%                |
| Peso        | Referência configurável | Desvio > 10%         |

---

## 🚀 Como Executar

### 1. Simular no Wokwi

1. Acesse [wokwi.com](https://wokwi.com).
2. Crie um projeto utilizando ESP32.
3. Substitua o `sketch.ino` pelo conteúdo de `clyvocare-esp32.ino`.
4. Cole o conteúdo de `clyvocare-wokwi-diagram.json` no arquivo `diagram.json`.
5. Clique em **Start Simulation**.
6. Acompanhe os dados pelo Serial Monitor.

> No Wokwi é utilizada a porta MQTT 1883 sem TLS.

### 2. Configurar Node-RED

Pré-requisitos:

```bash
npm install -g --unsafe-perm node-red
```

Inicie o Node-RED:

```bash
node-red
```

Acesse:

```text
http://localhost:1880
```

### 3. Instalar o Dashboard

No Node-RED:

1. Menu → **Manage Palette**.
2. Selecione **Install**.
3. Procure por:

```text
node-red-dashboard
```

4. Instale a biblioteca.

O dashboard estará disponível em:

```text
http://localhost:1880/ui
```

### 4. Importar o Flow

1. Abra o Node-RED.
2. Acesse Menu → **Import**.
3. Selecione o arquivo:

```text
node-red/clyvocare-nodered-flow.json
```

4. Clique em **Import**.
5. Configure o broker MQTT caso necessário.
6. Clique em **Deploy**.

### 5. Testar a Inteligência Artificial

No flow importado:

1. Localize o nó **Dados do Pet — Demonstração IA**.
2. Localize o nó **Motor de Regras Inteligentes**.
3. Abra a aba **Debug** do Node-RED.
4. Clique no botão do nó de demonstração.
5. Observe no Debug as recomendações geradas e ordenadas por prioridade.

### 6. Visualizar o Dashboard

Dashboard Node-RED:

```text
http://localhost:1880/ui
```

Dashboard web:

```text
dashboard/clyvocare-dashboard.html
```

---

## 📡 Tópicos MQTT

| Tópico                        | Direção          | Payload    | Descrição                       |
| ----------------------------- | ---------------- | ---------- | ------------------------------- |
| `clyvocare/esp32/temperatura` | ESP32 → Node-RED | `38.4`     | Temperatura                     |
| `clyvocare/esp32/umidade`     | ESP32 → Node-RED | `72.1`     | Umidade                         |
| `clyvocare/esp32/peso`        | ESP32 → Node-RED | `12.3`     | Peso simulado                   |
| `clyvocare/esp32/movimento`   | ESP32 → Node-RED | `0` ou `1` | Detecção de movimento           |
| `clyvocare/esp32/status`      | ESP32 → Node-RED | JSON       | Estado completo do dispositivo  |
| `clyvocare/alertas/critico`   | Node-RED → MQTT  | JSON       | Alerta crítico                  |
| `clyvocare/alertas/vacinas`   | Node-RED → MQTT  | JSON       | Alertas relacionados às vacinas |
| `clyvocare/historico`         | Node-RED → MQTT  | JSON       | Histórico dos sensores          |
| `clyvocare/cmd/buzzer`        | Node-RED → ESP32 | `ON`       | Acionamento remoto do buzzer    |
| `clyvocare/status`            | ESP32 → MQTT     | string     | Status online/offline           |

### Exemplo de payload

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
├── firmware/
│   ├── clyvocare-esp32.ino
│   └── clyvocare-wokwi-diagram.json
│
├── node-red/
│   └── clyvocare-nodered-flow.json
│
├── dashboard/
│   └── clyvocare-dashboard.html
│
├── docs/
│   └── arquitetura.png
│
├── Video/
│   └── Link Video.txt
│
└── README.md
```

---

## 📊 Resultados Parciais

### ✅ Implementado

* [x] Simulação ESP32 no Wokwi.
* [x] Sensores DHT22, PIR e potenciômetro.
* [x] Comunicação MQTT utilizando HiveMQ.
* [x] Processamento dos dados pelo Node-RED.
* [x] Dashboard para visualização das informações.
* [x] Alertas relacionados aos sensores.
* [x] Verificação de vacinas.
* [x] Motor de Regras Inteligentes.
* [x] Priorização de recomendações por score.
* [x] Personalização de acordo com os dados do pet.
* [x] Demonstração simulada do componente de IA.

---

## 👥 Equipe

| Nome                          |     RM |
| ----------------------------- | -----: |
| Felipe Maglio Filho           | 563512 |
| João Pedro Bitencourt Goldoni | 564339 |
| Marina Tamagnini Magalhães    | 561786 |
| Mateus Granja dos Santos      | 564930 |
| Vitória Valentina Maglio      | 563509 |

---

## 🎬 Links

* 📺 **Vídeo Pitch:** [YouTube — não listado](SUBSTITUIR_PELO_LINK_DO_VIDEO_DA_SPRINT_3)
* 💻 **Repositório:** [GitHub](SUBSTITUIR_PELO_LINK_DO_REPOSITORIO)
* 🐾 **Dashboard:** `dashboard/clyvocare-dashboard.html`

---

*Projeto desenvolvido para a disciplina **Disruptive Architectures: IoT, IoB & Generative IA — FIAP 2026**.*
