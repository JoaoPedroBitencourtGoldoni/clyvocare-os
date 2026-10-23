# IA Generativa com Guardrails — ClyvoCare OS (Sprint 4)

## Papel do LLM
Na Sprint 3 ficou definido (`IA-ESPECIFICACAO.md` §11) que o LLM seria usado **“apenas para explicar recomendações em linguagem natural, sempre limitado aos fatos produzidos pelo motor e com guardrails”**. A Sprint 4 implementa exatamente isso:

```text
Motor de regras (decide, pontua, ordena)  →  fatos estruturados
          │
          ▼
LLM (Anthropic Messages API) reescreve em linguagem natural  ──►  GUARDRAILS
                                                                    │ aprovado → texto do LLM
                                                                    │ reprovado / indisponível → template determinístico
```

O LLM **não** calcula score, não escolhe recomendações e não altera a ordem. Mesmo que falhe, o tutor sempre recebe recomendações corretas.

## Onde a IA generativa é usada
1. **Explicação das recomendações** (`src/ia/explicador.js`) — resumo + uma explicação por recomendação, com tom de **tutor** (acolhedor) ou **clínica** (técnico).
2. **Assistente conversacional** (`src/ia/chat.js`) — reescreve, de forma natural, a resposta fundamentada nos dados do pet.

## Configuração
```bash
export ANTHROPIC_API_KEY=sk-...        # habilita o LLM
export CLYVO_LLM_MODEL=claude-sonnet-4-6   # opcional (padrão)
npm start
```
Sem chave, o sistema funciona em **modo offline** (templates). A tela e a API indicam o modo (`geracao.modo`: `llm` ou `template`).

## Engenharia de prompt (resumo)
*System prompt:* papel (assistente de comunicação), regras obrigatórias (usar somente os fatos; nunca diagnosticar, prescrever ou citar dose; não alterar scores/ordem; no máximo 2 frases por explicação; público tutor × clínica) e **saída estrita em JSON** `{"resumo": "...", "explicacoes": ["..."]}`. *User prompt:* público + fatos mínimos (pet, data de referência, lista de recomendações com score/prioridade/motivo). Temperatura 0,2. Texto completo em `SYSTEM_EXPLICADOR` e `SYSTEM_CHAT`.

**Minimização de dados:** o prompt contém nome/espécie/fase do pet e os fatos da recomendação; **não** envia dados do tutor.

## Guardrails (`src/ia/guardrails.js`)
| Camada | O que faz |
|---|---|
| Entrada do chat | **Emergência** (convulsão, engasgo, sangramento, envenenamento…) → orientação de urgência fixa, sem LLM. **Diagnóstico** e **medicação/dose** → recusa segura com redirecionamento ao veterinário. |
| Formato | Resposta deve ser JSON válido com a mesma quantidade de explicações das recomendações. |
| Fundamentação numérica | Todo número do texto precisa existir nos fatos (anti-alucinação). Ex.: “atrasada há 45 dias” é bloqueado se o fato é 16. |
| Conteúdo proibido | Diagnóstico afirmado, doença atribuída ao pet, prescrição, dosagem (mg/ml…), “não precisa ir ao veterinário”, promessas absolutas. |
| Fallback | Qualquer reprovação, timeout ou erro HTTP → template determinístico fiel aos fatos; a razão fica em `geracao.fallbackMotivo`. |

Eficácia medida em `docs/RELATORIO-RESULTADOS.md` (10/10 saídas adversariais simuladas bloqueadas, saída válida aceita) e coberta por `tests/generativa.test.js` e `tests/chat.test.js`.

## Transparência para o usuário
A interface mostra se o texto veio de **IA generativa (modelo) com guardrails aprovados** ou de **template determinístico**, além da latência, da trilha de auditoria (`/api/clinica/auditoria`) e do aviso de que as recomendações não substituem o veterinário.

## Limitações
- Os guardrails por regex/números reduzem, mas não eliminam, o risco de saídas inadequadas; por isso o motor determinístico permanece como fonte dos fatos e há revisão humana na clínica.
- A integração real com o LLM depende de chave de API; os testes automatizados usam um LLM simulado (sem rede) para tornar a validação reproduzível.

## Correção de segurança dos guardrails numéricos (revisão da Sprint 4)

Na primeira versão, `numerosPermitidos` liberava automaticamente todos os números de 0 a 12, o que permitia ao LLM afirmar, por exemplo, “atrasada há 12 dias” quando o fato real era 16 dias. A liberação genérica foi removida: agora **só são aceitos números presentes nos fatos enviados ao modelo** (incluindo `indice` e `totalRecomendacoes`, que cobrem enumerações e totais de forma fundamentada). Testes de regressão em `backend/tests/generativa.test.js` garantem que 16 dias é aceito e que 12, 9, 7, 11 e 45 dias são rejeitados, com fallback ao template determinístico.
