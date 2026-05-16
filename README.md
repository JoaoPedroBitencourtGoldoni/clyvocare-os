# 🐾 ClyvoCare OS — Sistema de Saúde do Pet

> **IoT + MQTT + IA para saúde preventiva de pets**  
> Protótipo acadêmico — FIAP · Disruptive Architectures: IoT, IoB & Generative IA

---

## 📋 Sumário

- [O Problema](#-o-problema)
- [A Solução](#-a-solução)
- [Arquitetura](#-arquitetura)
- [Tecnologias](#-tecnologias)
- [Componentes IoT](#-componentes-iot)
- [Como Executar](#-como-executar)
- [Node-RED: Importar Flow](#-node-red-importar-flow)
- [Tópicos MQTT](#-tópicos-mqtt)
- [Estrutura do Repositório](#-estrutura-do-repositório)
- [Resultados Parciais](#-resultados-parciais)
- [Equipe](#-equipe)

---

## 🔴 O Problema

No Brasil, **mais de 140 milhões de pets** dependem de cuidados de saúde preventiva. O principal problema:

- **Tutores esquecem** datas de vacinas, vermifugação e consultas de rotina
- **Clínicas não têm visibilidade** sobre o histórico completo dos pacientes
- **Doenças regionais** (Leishmaniose, Parvovirose) se espalham por falta de monitoramento coletivo
- **Fase de vida** do animal (filhote, adulto, idoso) determina cuidados diferentes — quase sempre ignorados

---

## 💡 A Solução

**ClyvoCare OS** é um sistema IoT + IA que monitora a saúde do pet em tempo real e automatiza os cuidados:

| Funcionalidade | Como funciona |
|---|---|
| 🌡️ Sensores IoT | ESP32 com DHT22 e sensores envia dados via MQTT |
| 📊 Dashboard | Interface web em tempo real com alertas visuais |
| 💉 Calendário Vacinal | Alertas automáticos por fase de vida do pet |
| 📱 WhatsApp | Lembretes automáticos disparados pelo Node-RED |
| 🗺️ Risco Regional IA | Análise de doenças por zona geográfica |
| 🏥 Histórico Clínico | Dados centralizados para clínicas |

---

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────────────────┐
│                    ClyvoCare OS                         │
│                                                         │
│  ┌──────────┐    MQTT     ┌──────────┐    HTTP          │
│  │  ESP32   │ ──────────► │ HiveMQ   │ ──────────►      │
│  │  Wokwi   │             │  Broker  │                  │
│  └──────────┘             └────┬─────┘                  │
│       ↑                        │ MQTT Subscribe         │
│  DHT22│PIR│POT                 ↓                        │
│  Buzzer│LEDs            ┌──────────────┐                │
│                         │  Node-RED    │                │
│                         │  Flow        │                │
│                         └──────┬───────┘                │
│                                │                        │
│                    ┌───────────┼───────────┐            │
│                    ↓           ↓           ↓            │
│              ┌──────────┐ ┌────────┐ ┌──────────┐       │
│              │Dashboard │ │WhatsApp│ │  Alertas │       │
│              │  Web     │ │  API   │ │  MQTT    │       │
│              └──────────┘ └────────┘ └──────────┘       │
└─────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tecnologias

| Tecnologia | Uso no Projeto |
|---|---|
| **ESP32** (Wokwi) | Microcontrolador principal, coleta sensores |
| **DHT22** | Temperatura e umidade do ambiente do pet |
| **Potenciômetro** | Simula célula de carga (peso do pet) |
| **PIR HC-SR501** | Detecção de movimento/atividade do pet |
| **Buzzer** | Alerta sonoro local em caso de temperatura crítica |
| **MQTT (HiveMQ)** | Protocolo de mensageria IoT — publicação e subscrição |
| **Node-RED** | Orquestração de fluxos: processa dados, gera alertas |
| **Arduino JSON** | Serialização de dados do ESP32 |
| **Dashboard HTML/CSS/JS** | Visualização em tempo real dos dados |

---

## ⚡ Componentes IoT

### Sensores utilizados

| Sensor | Pino ESP32 | O que mede |
|---|---|---|
| DHT22 | GPIO 4 | Temperatura corporal e umidade |
| Potenciômetro | GPIO 34 (ADC) | Peso do pet (0–50 kg simulado) |
| PIR HC-SR501 | GPIO 18 | Movimento / atividade física |
| Buzzer | GPIO 19 | Alerta sonoro (saída) |
| LED Verde | GPIO 2 | Status da conexão |
| LED Vermelho | GPIO 5 | Alerta crítico ativo |

### Parâmetros de alerta

| Parâmetro | Faixa Normal | Alerta |
|---|---|---|
| Temperatura (cão) | 37.5°C – 39.2°C | < 37.5°C ou > 39.2°C |
| Umidade ambiente | 40% – 75% | > 75% |
| Peso (referência) | Ajustável por porte | Desvio > 10% |

---

## 🚀 Como Executar

### 1. Simular no Wokwi

1. Acesse [wokwi.com](https://wokwi.com) → "New Project" → ESP32
2. Substitua o `sketch.ino` pelo arquivo `clyvocare-esp32.ino`
3. Cole o conteúdo de `clyvocare-wokwi-diagram.json` em `diagram.json`
4. Clique em ▶ **Start Simulation**
5. Veja os dados sendo publicados no Serial Monitor

> **Importante:** No Wokwi, use a porta 1883 (sem TLS). Para produção real, use 8883 com TLS.

### 2. Configurar Node-RED

**Pré-requisitos:**
```bash
# Instalar Node-RED
npm install -g --unsafe-perm node-red

# Iniciar
node-red
# Acesse: http://localhost:1880
```

**Instalar paleta dashboard:**
1. Menu → Manage Palette → Install
2. Buscar e instalar: `node-red-dashboard`
3. Acessar dashboard em: `http://localhost:1880/ui`

### 3. Importar Flow Node-RED

1. Abrir Node-RED → Menu (☰) → **Import**
2. Colar conteúdo de `clyvocare-nodered-flow.json`
3. Clicar em **Import**
4. **Configurar credenciais HiveMQ:**
   - Dar duplo clique no nó `HiveMQ Broker`
   - Preencher: Broker `broker.hivemq.com`, Porta `8883`
   - Adicionar usuário e senha (se usar HiveMQ Cloud)
5. Clicar em **Deploy**

### 4. Visualizar Dashboard

Abra no navegador:
- **Dashboard Node-RED:** `http://localhost:1880/ui`
- **Dashboard Custom:** Abrir arquivo `clyvocare-dashboard.html` diretamente no navegador

---

## 📡 Tópicos MQTT

| Tópico | Direção | Payload | Descrição |
|---|---|---|---|
| `clyvocare/esp32/temperatura` | ESP32 → | `38.4` | Temperatura em °C |
| `clyvocare/esp32/umidade` | ESP32 → | `72.1` | Umidade em % |
| `clyvocare/esp32/peso` | ESP32 → | `12.3` | Peso em kg |
| `clyvocare/esp32/movimento` | ESP32 → | `0` ou `1` | PIR detectou movimento |
| `clyvocare/esp32/status` | ESP32 → | JSON | Status completo do dispositivo |
| `clyvocare/alertas/critico` | Node-RED → | JSON | Alerta de temperatura crítica |
| `clyvocare/alertas/vacinas` | Node-RED → | JSON | Alerta de vacinas vencidas |
| `clyvocare/ia/risco-regional` | Node-RED → | JSON | Análise de risco por região |
| `clyvocare/historico` | Node-RED → | JSON | Histórico dos sensores |
| `clyvocare/cmd/buzzer` | → ESP32 | `ON` | Aciona buzzer remotamente |
| `clyvocare/status` | ESP32 → | string | Online/Offline |

**Exemplo de payload de status completo:**
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

```
clyvocare-os/
│
├── firmware/
│   ├── clyvocare-esp32.ino          # Código principal ESP32
│   └── clyvocare-wokwi-diagram.json # Diagrama de circuito Wokwi
│
├── node-red/
│   └── clyvocare-nodered-flow.json  # Flow completo para importar
│
├── dashboard/
│   └── clyvocare-dashboard.html     # Dashboard web standalone
│
├── docs/
│   ├── arquitetura.png              # Diagrama de arquitetura
│   └── demo-screenshot.png         # Screenshot do sistema
│
└── README.md
```

---

## 📊 Resultados Parciais

### ✅ Implementado
- [x] ESP32 simulado no Wokwi com DHT22, PIR, Buzzer, LEDs
- [x] Publicação de dados via MQTT no HiveMQ (tópicos estruturados)
- [x] Flow Node-RED completo com processamento de alertas
- [x] Lógica de verificação de vacinas com calendário por fase de vida
- [x] Análise de risco regional simulada (base para IA futura)
- [x] Dashboard web com feed MQTT em tempo real simulado
- [x] Alertas automáticos para temperatura crítica
- [x] Estrutura para integração WhatsApp via Node-RED

### 🔄 Próximos Passos
- [ ] Integrar API real de WhatsApp (Twilio/Z-API)
- [ ] Conectar IA generativa (Claude API) para análise de risco regional real
- [ ] App mobile com React Native
- [ ] Banco de dados persistente (PostgreSQL/MongoDB)
- [ ] Autenticação de clínicas e tutores
- [ ] Câmera + visão computacional para detecção de comportamento

---

## 👥 Equipe

| Nome | RM |
|---|---|
| [João Pedro Bitencourt Goldoni] | 564339 |
| [Marina Tamagnini Magalhães] | 561786 |
| [Vitória Valentina Maglio] | 563509 |
| [Vitória Valentina Maglio] | 563509 |
| [Vitória Valentina Maglio] | 563509 |

---

## 🎬 Links

- 📺 **Vídeo Pitch:** [YouTube — não listado](#)
- 💻 **Repositório:** [GitHub](#)
- 🐾 **Dashboard Live:** Abrir `clyvocare-dashboard.html`

---

*Projeto desenvolvido para a disciplina **Disruptive Architectures: IoT, IoB & Generative IA** — FIAP 2025*
