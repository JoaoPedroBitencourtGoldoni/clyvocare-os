# Dicionário de Dados da IA — ClyvoCare OS

## Dados de entrada

| Campo | Tipo | Origem | Obrigatório no protótipo | Uso |
|---|---|---|---|---|
| `dataReferencia` | `date` | Sistema/demonstração | Não | Base dos cálculos de atraso |
| `perfil.id` | `string` | Cadastro | Recomendado | Identificar o pet |
| `perfil.nome` | `string` | Cadastro | Recomendado | Exibição da recomendação |
| `perfil.especie` | `string` | Cadastro | Recomendado | Contexto do animal |
| `perfil.idadeAnos` | `number` | Cadastro | Não | Contexto |
| `perfil.faseVida` | `filhote/adulto/idoso` | Cadastro/regra da aplicação | Sim para personalização | Intervalo da consulta preventiva |
| `historicoClinico[]` | `array<object>` | Sistema da clínica | Não | Contexto/auditoria |
| `vacinas[].nome` | `string` | Histórico vacinal | Sim para R1 | Ação recomendada |
| `vacinas[].proximaDose` | `date` | Histórico vacinal | Sim para R1 | Calcular atraso |
| `vacinas[].status` | `string` | Histórico vacinal | Não | Reforçar detecção de atraso |
| `consultas[].data` | `date` | Histórico clínico | Sim para R2 | Calcular dias sem consulta |
| `consultas[].tipo` | `string` | Histórico clínico | Não | Contexto |
| `medicamentos[].status` | `string` | Tratamento | Sim para R3 | Confirmar tratamento ativo |
| `medicamentos[].retornoRecomendado` | `boolean` | Prescrição/registro clínico | Sim para R3 | Ativar verificação de retorno |
| `medicamentos[].dataRetorno` | `date` | Registro clínico | Sim para R3 | Calcular atraso do retorno |
| `comportamento.variacaoAtividadePercentual` | `number` | IoT + registro do tutor | Sim para R4 | Detectar queda relevante de atividade |
| `comportamento.origem` | `string` | Sistema | Não | Explicabilidade |

## Dados de saída

| Campo | Tipo | Finalidade |
|---|---|---|
| `pet` | `object` | Identificação contextual |
| `abordagemIA` | `string` | Transparência do mecanismo |
| `estrategiaPersonalizacao` | `string` | Explicar personalização |
| `totalRecomendacoes` | `number` | Resumo |
| `recomendacoes[].servico` | `string` | Categoria da ação |
| `recomendacoes[].acao` | `string` | Próximo passo sugerido |
| `recomendacoes[].score` | `number` | Prioridade quantitativa |
| `recomendacoes[].prioridade` | `ALTA/MEDIA/BAIXA` | Classificação legível |
| `recomendacoes[].motivo` | `string` | Explicabilidade |
| `recomendacoes[].dadosUtilizados` | `array<string>` | Rastreabilidade |
| `geradoEm` | `datetime` | Auditoria |
| `aviso` | `string` | Guardrail de segurança |

## Qualidade de dados esperada

Antes de uma implantação real, a API deve validar:

- datas em formato ISO-8601;
- ausência de datas futuras inválidas em histórico;
- fase de vida dentro dos valores aceitos;
- percentuais numéricos válidos;
- consistência entre status da vacina e data da próxima dose;
- identificação do pet e vínculo correto com o tutor;
- dados faltantes, evitando gerar recomendações com contexto insuficiente.

## Privacidade

Dados cadastrais do tutor não são necessários para o cálculo das regras atuais. A entrada da IA deve receber somente o contexto mínimo do pet necessário para a recomendação, aplicando o princípio de minimização de dados.
