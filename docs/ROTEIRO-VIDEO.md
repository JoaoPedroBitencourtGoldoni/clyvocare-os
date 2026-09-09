# Roteiro do Vídeo Pitch — aproximadamente 5 minutos

> Este arquivo é apoio para gravação. Antes da entrega, publique o vídeo no YouTube como **não listado** e atualize `Video/Link Video.txt` e o link no README.

## 0:00–0:35 — Abertura e problema

**Mostrar:** README no título e seção "O Problema".

**Falar:**

"Olá, somos a equipe responsável pelo ClyvoCare OS. Nossa proposta é apoiar a jornada contínua de cuidado do pet integrando IoT, MQTT e Inteligência Artificial. O problema que queremos resolver é que o tutor e a clínica acumulam dados de vacinas, consultas, tratamentos e comportamento, mas nem sempre esses dados viram uma ação no momento certo. Por isso, a pergunta que a nossa IA responde é: qual cuidado deve ser priorizado para este pet agora?"

## 0:35–1:25 — Solução e escolha da IA

**Mostrar:** seções "A Solução" e "Componente de Inteligência Artificial" do README.

**Falar:**

"Para esta Sprint escolhemos um Motor de Regras Inteligentes com scoring. Essa abordagem é adequada porque nossos dados são estruturados e as condições são objetivas, como atraso de vacina, intervalo sem consulta, retorno de tratamento e queda de atividade. O motor é determinístico, explicável e não exige uma base histórica rotulada para treinamento. Um LLM ou modelo preditivo poderia ser usado em uma evolução, mas aqui aumentaria a complexidade e, no caso de um LLM, o risco de uma orientação clínica não controlada. A IA é apoio à decisão e não realiza diagnóstico veterinário."

## 1:25–2:10 — Dados e personalização

**Mostrar:** tabela "Dados Utilizados pela IA" e, se quiser, `examples/ia-input-thor.json`.

**Falar:**

"A entrada contém perfil do pet, histórico clínico, vacinas, consultas, medicamentos e comportamento. A personalização usa o contexto individual. Por exemplo, o intervalo de consulta é diferente por fase de vida: 90 dias para filhote, 180 para adulto e 120 para idoso. Também consideramos o histórico específico daquele pet e uma variação de atividade que pode vir do IoT e do registro do tutor."

## 2:10–3:05 — Arquitetura e fluxo de dados

**Mostrar:** diagrama Mermaid em "Arquitetura de Integração" ou `docs/ARQUITETURA-IA.md`.

**Falar:**

"Na arquitetura completa, tutor e clínica usam a aplicação, que conversa com a API e o banco de dados. O ESP32 envia dados por MQTT ao HiveMQ, e o Node-RED faz a orquestração. Os dados estruturados do pet chegam ao Motor de Regras, que calcula scores e devolve recomendações priorizadas. Nesta Sprint, a parte realmente demonstrada vai do ESP32 e MQTT ao Node-RED e ao motor. A entrada clínica da IA é simulada por um nó de demonstração para tornar o teste reproduzível. A integração da aplicação, API e banco representa a próxima etapa da arquitetura."

## 3:05–4:15 — Demonstração funcional

**Mostrar na tela:**

1. Wokwi/ESP32 em execução por alguns segundos;
2. Node-RED recebendo dados ou o dashboard;
3. sem editar o flow, localizar visualmente o nó **Dados do Pet — Demonstração IA**;
4. abrir a aba Debug;
5. clicar uma vez no inject **Dados do Pet — Demonstração IA**;
6. mostrar o resultado do **DEBUG Recomendações IA**;
7. expandir o JSON e apontar `score`, `prioridade`, `motivo` e `dadosUtilizados`;
8. se estiver conveniente, mostrar o dashboard web com as quatro recomendações.

**Falar:**

"Para a demonstração usamos o Thor, um cão adulto. Ele possui vacina de Raiva atrasada, retorno de tratamento pendente, redução de 35% na atividade e intervalo de consulta superior ao parâmetro de um adulto. Ao acionar os dados de demonstração, o motor gera quatro recomendações. Vacinação recebe score 93 e prioridade alta; retorno clínico, 90 e prioridade alta; mudança de comportamento, 80; e consulta preventiva, 70. Além do score, cada saída informa o motivo e os dados usados, garantindo explicabilidade."

## 4:15–4:50 — Benefícios e segurança

**Mostrar:** seção "Benefícios da IA" e rapidamente `docs/IA-ESPECIFICACAO.md` em guardrails.

**Falar:**

"Para o tutor, o benefício é saber qual próximo cuidado merece atenção e por quê. Para a clínica, é possível organizar pendências e priorizar acompanhamento. Para o pet, a proposta favorece cuidado preventivo mais individualizado. Como limite de segurança, o sistema não diagnostica nem prescreve: ele recomenda ações de acompanhamento e mantém o profissional veterinário no processo de decisão."

## 4:50–5:05 — Encerramento

**Mostrar:** estrutura do repositório/GitHub.

**Falar:**

"O repositório contém firmware, fluxo Node-RED, dashboard, documentação da IA, arquitetura, dicionário de dados, exemplos e plano de validação. Assim, entregamos uma solução demonstrável, explicável e preparada para evoluir para uma integração completa com a aplicação ClyvoCare. Obrigado."

## Checklist rápido antes de gravar

- Fechar abas e notificações pessoais.
- Deixar Wokwi, Node-RED Debug, README/diagrama e dashboard já abertos.
- Aumentar zoom do navegador/VS Code para o texto ficar legível no vídeo.
- Não gastar tempo mostrando código inteiro; mostrar evidências.
- Demonstrar a IA clicando no inject e exibindo a saída.
- Falar explicitamente "implementado nesta Sprint" versus "arquitetura proposta".
- Manter o vídeo entre aproximadamente 4:40 e 5:20.
- Publicar como **não listado**.
- Testar o link em janela anônima antes de enviar.
