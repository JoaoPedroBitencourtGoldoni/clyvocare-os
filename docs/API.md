# Referência da API — ClyvoCare OS (Sprint 4)

Base: `http://localhost:3000` · JSON · sem autenticação (protótipo acadêmico; ver *Limitações*).
Parâmetro comum `dataReferencia=AAAA-MM-DD` (query ou corpo): data usada nos cálculos. Padrão: hoje. A data **2026-08-31** reproduz o cenário da Sprint 3.

## Saúde e metadados

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/saude` | Status da API, banco, modo da IA generativa (LLM ou offline) e do MQTT |
| GET | `/api/ia/parametros` | Parâmetros do motor (limiares, scores, intervalos por fase de vida) |

## IA como serviço (stateless)

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/ia/analisar` | Recebe o JSON de entrada da Sprint 3 (`examples/ia-input-thor.json`) e devolve recomendações + `qualidadeDados`. `422` se a validação falhar |

## Pets e recomendações (integração App ↔ API ↔ BD ↔ IA)

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/pets` | Lista de pets |
| POST | `/api/pets` | Cadastra pet `{nome, especie: cao\|gato, idadeAnos, tutorId?}`; a fase de vida é calculada |
| GET | `/api/pets/:id` | Contexto completo do pet (o mesmo que alimenta a IA) + últimos valores IoT |
| GET | `/api/pets/:id/recomendacoes` | **Pipeline completo:** banco → validação → motor de regras → explicação (LLM/template) → auditoria → MQTT. Query: `publico=tutor\|clinica`, `explicar=false`, `persistir=false`, `publicarMqtt=false` |
| POST | `/api/recomendacoes/:rid/feedback` | `{feedback: agendado\|dispensado\|util\|nao_util}` (adesão do tutor) |
| POST | `/api/recomendacoes/:rid/revisao` | `{revisao: aprovada\|rejeitada}` (humano no circuito — clínica) |

## Registro de dados (alimentam a IA)

| Método | Rota | Corpo |
|---|---|---|
| POST | `/api/pets/:id/vacinas/:vid/aplicar` | `{dataAplicacao}` — recalcula a próxima dose pelo intervalo da vacina |
| POST | `/api/pets/:id/consultas` | `{data, tipo}` |
| POST | `/api/pets/:id/medicamentos/:mid/retorno-realizado` | `{data}` |
| POST | `/api/pets/:id/comportamento` | `{variacaoAtividadePercentual, observacao?}` (registro do tutor) |

## IoT

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/pets/:id/iot` | Última leitura de cada sensor |
| POST | `/api/pets/:id/iot` | `{tipo: temperatura\|umidade\|peso\|movimento, valor, ts?}` |
| POST | `/api/pets/:id/iot/simular` | `{perfil: normal\|queda}` — simula 24 h de leituras PIR (demonstração sem Wokwi) |

O backend também **assina via MQTT** `clyvocare/esp32/{temperatura,umidade,peso,movimento}` e grava as leituras para o pet definido em `IOT_PET_ID`. A variação de atividade usada na regra R4 é calculada como `(atividade_atual − baseline) / baseline × 100`, onde atividade = % de leituras PIR ativas nas últimas 24 h (mínimo de 12 amostras; caso contrário usa o último registro do tutor).

## Assistente conversacional

| Método | Rota | Descrição |
|---|---|---|
| POST | `/api/pets/:id/chat` | `{mensagem, dataReferencia?}` → `{resposta, intencao, modo: regra\|llm\|guardrail, fontes, sugestoes}` |

## Clínica

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/clinica/painel` | Pacientes ordenados pelo maior score |
| GET | `/api/clinica/metricas` | Análises, recomendações por prioridade/regra, adesão, revisões, conversas |
| GET | `/api/clinica/auditoria` | Últimas execuções da IA |
| GET | `/api/analises/:aid` | Contexto de entrada e saída exatos de uma execução (rastreabilidade) |

## Exemplo

```bash
curl "http://localhost:3000/api/pets/pet-001/recomendacoes?dataReferencia=2026-08-31"
curl -X POST http://localhost:3000/api/pets/pet-001/chat -H "content-type: application/json" \
     -d '{"mensagem":"Como estão as vacinas?","dataReferencia":"2026-08-31"}'
```

Resposta de `/recomendacoes` (resumida): `pet`, `abordagemIA`, `totalRecomendacoes`, `recomendacoes[]` (`regra`, `servico`, `acao`, `score`, `prioridade`, `motivo`, `dadosUtilizados`, `explicacao`, `id`), `resumo`, `geracao` (`modo`, `modelo`, `validacao`, `latenciaMs`), `qualidadeDados`, `contextoComportamento`, `analiseId`, `aviso`.

## Códigos de erro
`400` JSON malformado · `404` pet/recomendação/rota inexistente · `422` dados inválidos (mensagens em `detalhes`) · `500` erro interno.

## Limitações
Sem autenticação/autorização e sem criptografia em repouso — em produção aplicar OAuth2/JWT, RBAC (tutor vs. clínica), TLS e LGPD (ver `docs/IA-ESPECIFICACAO.md` §9).
