# Plano de Validação da IA — ClyvoCare OS

Este documento descreve casos de teste do comportamento esperado do Motor de Regras Inteligentes. O objetivo é demonstrar que as decisões são reproduzíveis, explicáveis e coerentes com as regras documentadas.

## Caso 1 — Cenário de demonstração Thor

**Entrada:** adulto; Raiva 16 dias atrasada; consulta há 211 dias; retorno há 11 dias; atividade -35%.

**Resultado esperado:** 4 recomendações, ordenadas:

1. Vacinação — score 93 — ALTA;
2. Retorno clínico — score 90 — ALTA;
3. Avaliação veterinária — score 80 — MÉDIA;
4. Consulta preventiva — score 70 — MÉDIA.

## Caso 2 — Pet adulto sem pendências

**Entrada:** vacinas em dia; consulta há menos de 180 dias; sem retorno vencido; atividade acima de -30%.

**Resultado esperado:** nenhuma recomendação dessas quatro regras.

## Caso 3 — Personalização por fase de vida

**Entrada:** pet idoso com 130 dias desde a última consulta e sem outras pendências.

**Resultado esperado:** Consulta preventiva — score 70 — MÉDIA, porque para idoso a referência é 120 dias.

Para um adulto com os mesmos 130 dias, a regra de consulta não deve disparar, pois a referência é 180 dias.

## Caso 4 — Escalonamento de vacina atrasada

**Entrada:** vacina 40 dias atrasada.

**Cálculo esperado:** `min(100, 85 + min(40,30)/2) = 100`.

**Resultado esperado:** Vacinação — score 100 — ALTA.

## Caso 5 — Limiar comportamental

- Variação `-29%`: a regra R4 não dispara.
- Variação `-30%`: a regra R4 dispara com score 80.

Esse teste valida o limiar configurado no protótipo.

## Caso 6 — Retorno clínico

- Data de retorno anterior à data de referência: gera recomendação score 90.
- Data de retorno igual ou posterior à referência: não deve gerar atraso.

## Critérios de aceite

- mesma entrada produz a mesma recomendação e score;
- recomendações ficam em ordem decrescente de score;
- cada recomendação contém motivo e dados utilizados;
- nenhuma saída afirma diagnóstico;
- parâmetros configurados devem estar documentados.

## Observação acadêmica

Os limiares e scores são heurísticos do protótipo. Em um sistema real, a calibração deverá ser feita com especialistas veterinários e dados históricos, acompanhada por métricas de qualidade e revisão contínua.
