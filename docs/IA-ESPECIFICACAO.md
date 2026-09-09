# Especificação Técnica da IA — ClyvoCare OS

## 1. Objetivo do componente

O componente de Inteligência Artificial do ClyvoCare OS tem como objetivo responder a uma pergunta de negócio específica:

> **Qual cuidado deve ser priorizado para este pet neste momento, considerando seu contexto individual?**

O componente atua como apoio à decisão para tutor e clínica, convertendo dados estruturados em recomendações explicáveis e ordenadas por prioridade. Ele **não realiza diagnóstico, prescrição ou substituição da avaliação veterinária**.

## 2. Abordagem escolhida e justificativa

A abordagem adotada é um **Motor de Regras Inteligentes com mecanismo de scoring e priorização**.

### Por que esta abordagem é adequada nesta Sprint?

1. Os dados disponíveis são majoritariamente estruturados: datas de vacina, consultas, fase de vida, tratamento, retorno e variação de atividade.
2. Existem critérios objetivos que podem ser expressos como regras determinísticas.
3. A solução precisa ser auditável: tutor e clínica devem entender por que uma recomendação foi produzida.
4. Não existe, nesta etapa, uma base histórica grande, rotulada e validada clinicamente para treinar um modelo preditivo.
5. O protótipo reduz risco de alucinação ao não utilizar um LLM para produzir orientação clínica livre.

### Comparação com alternativas

| Abordagem | Vantagem | Limitação neste projeto | Decisão |
|---|---|---|---|
| Motor de regras inteligentes | Alta explicabilidade, baixo custo e não exige treinamento | Precisa de manutenção das regras | **Escolhida** |
| LLM / IA Generativa | Boa interação em linguagem natural | Pode alucinar e é desnecessário para os dados estruturados atuais | Evolução futura para explicação conversacional, com guardrails |
| Modelo preditivo | Pode estimar risco a partir de padrões históricos | Exige base histórica rotulada e validação clínica | Futuro |
| Sistema de recomendação | Aprende preferência/adesão do usuário | Exige histórico de interações e feedback | Futuro |
| NLP | Extrai informação de texto clínico | Os dados da Sprint já estão estruturados | Futuro para prontuários textuais |

## 3. Entradas do motor

O motor recebe um objeto JSON com os seguintes grupos de dados:

- `perfil`: identificação, espécie, idade e fase de vida;
- `historicoClinico`: eventos clínicos relevantes;
- `vacinas`: nome, próxima dose e situação;
- `consultas`: data e tipo;
- `medicamentos`: status do tratamento e data de retorno;
- `comportamento`: variação percentual de atividade e origem do dado;
- `dataReferencia`: data utilizada para tornar a demonstração reproduzível.

Um exemplo completo está em `examples/ia-input-thor.json`.

## 4. Regras implementadas

As regras abaixo refletem a lógica já implementada no nó **Motor de Regras Inteligentes** do fluxo Node-RED.

### Regra R1 — Vacinação atrasada

**Condição:** `status == "atrasada"` ou a data da próxima dose já passou.

**Score:**

```text
score = min(100, 85 + min(dias_de_atraso, 30) / 2)
```

Isso significa que o atraso aumenta a prioridade progressivamente, limitado a 100 pontos.

**Ação:** recomendar o agendamento do reforço.

### Regra R2 — Consulta preventiva personalizada

O intervalo máximo é personalizado por fase de vida:

| Fase | Intervalo de referência |
|---|---:|
| Filhote | 90 dias |
| Adulto | 180 dias |
| Idoso | 120 dias |

**Condição:** dias desde a última consulta > intervalo da fase de vida.

**Score:** 70.

**Ação:** recomendar consulta preventiva.

> Os intervalos são parâmetros do protótipo acadêmico. Em implantação real, devem ser validados e configurados pela equipe veterinária responsável.

### Regra R3 — Retorno de tratamento pendente

**Condição:** tratamento ativo + retorno recomendado + data de retorno já ultrapassada.

**Score:** 90.

**Ação:** recomendar agendamento de retorno clínico.

### Regra R4 — Mudança relevante de atividade

**Condição:** variação de atividade <= `-30%` em relação ao padrão registrado.

**Score:** 80.

**Ação:** sugerir avaliação veterinária por mudança de comportamento.

> O motor não conclui que existe uma doença; ele apenas identifica uma mudança que merece avaliação.

## 5. Classificação de prioridade

| Score | Prioridade |
|---:|---|
| >= 90 | ALTA |
| 60 a 89 | MÉDIA |
| < 60 | BAIXA |

Após o cálculo, as recomendações são ordenadas do maior score para o menor.

## 6. Explicabilidade

Cada recomendação devolve:

- serviço sugerido;
- ação;
- score;
- prioridade;
- motivo;
- dados utilizados.

Esse desenho permite auditar a decisão e mostrar ao usuário quais informações levaram à recomendação.

## 7. Personalização

A personalização ocorre em três níveis:

1. **Fase de vida:** altera o intervalo de consulta preventiva.
2. **Histórico individual:** considera datas de vacinas, consultas e retornos do próprio pet.
3. **Contexto comportamental:** utiliza a variação de atividade registrada para aquele animal.

Em uma evolução, espécie, raça, condições crônicas, peso, histórico de adesão e protocolos configurados pela clínica podem ampliar a personalização.

## 8. Saída

A saída é um JSON com identificação do pet, abordagem da IA, estratégia de personalização, total de recomendações, recomendações ordenadas e aviso de segurança. Exemplo: `examples/ia-output-thor.json`.

## 9. Guardrails, segurança e governança

- Não gerar diagnóstico ou prescrição automática.
- Exibir justificativa da recomendação.
- Permitir revisão humana pela clínica.
- Minimizar dados pessoais e armazenar apenas o necessário.
- Em produção, aplicar autenticação, autorização, criptografia em trânsito e em repouso e trilha de auditoria.
- Em produção, definir retenção e tratamento dos dados cadastrais do tutor em conformidade com a LGPD.
- Parâmetros clínicos e scores devem ser validados por profissional veterinário antes de uso real.

## 10. Limitações atuais

- Regras e pesos são heurísticos e demonstrativos.
- Os dados clínicos da demonstração são simulados.
- A integração App/API/Banco de Dados é arquitetura proposta para continuidade do projeto.
- A Sprint não possui dataset rotulado para treinamento/avaliação de modelo estatístico.

## 11. Evolução da IA

A evolução recomendada é híbrida:

1. manter o motor de regras para regras clínicas objetivas e auditáveis;
2. adicionar modelo preditivo somente após existir dataset histórico validado;
3. usar LLM apenas para explicar recomendações em linguagem natural, sempre limitado aos fatos produzidos pelo motor e com guardrails;
4. coletar feedback de tutor/clínica para medir adesão e qualidade das recomendações.
