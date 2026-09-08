# Decisões de modelagem e pontos em aberto

O prompt original pede explicitamente para "questionar premissas ambíguas em vez de assumir silenciosamente" e "sinalizar todo ponto onde a legislação ainda depende de regulamentação". Como o MVP foi construído numa única sessão (a pedido do usuário, priorizando ter algo funcional rapidamente em vez de rodadas de perguntas a cada etapa), este documento registra as decisões tomadas no lugar de perguntas, para que fiquem visíveis e revisáveis.

## Decisões de modelagem

**Stack**: Angular + TypeScript no frontend, Node/Express no backend, motor de cálculo em TypeScript puro — combinado com o usuário, pensando na integração futura com Firebase (SDK nativo em JS/TS).

**DAS-MEI não é calculado pelo sistema.** O valor muda todo mês de janeiro (é indexado ao salário mínimo) e sua composição exata (INSS 5% + ICMS R$1 e/ou ISS R$5) é fácil de errar. Decisão: pedir o valor como **entrada do usuário** (ele confere no gerador de boleto do Portal do Empreendedor), em vez de tentar adivinhar um número que ficaria desatualizado ou errado. Isso respeita a restrição do prompt de nunca hardcodar alíquota — e um valor "chutado" seria pior que pedir a entrada.

**RBT12 = 0 (empresa em início de atividade).** A regra legal correta é usar a média aritmética dos meses de atividade para projetar a receita bruta dos 12 meses. O MVP simplifica isso usando a alíquota **nominal** da 1ª faixa do anexo como aproximação conservadora, e sinaliza isso explicitamente no memorial de cálculo e em um alerta. Ponto para refinar na Fase 2, com um contador confirmando a regra de projeção correta caso a caso.

**Rateio de custo fixo por tempo de produção** foi implementado recebendo o mix completo de produtos (ficha técnica + volume estimado de cada um) como parâmetro da chamada de cálculo, e não como um estado persistido de "plano de produção mensal". Trade-off consciente para não introduzir uma entidade nova (plano de produção) que o prompt não pediu explicitamente no MVP.

**Composição do preço para relatório é só dado de exibição.** Os valores de matéria-prima/embalagem/mão de obra/tributos etc. que aparecem na barra de composição são calculados em `Decimal` (precisão arbitrária) e não passam por arredondamento a centavos — a soma deles pode ficar 1 centavo diferente do preço de venda final (que É arredondado). Isso é o mesmo comportamento de qualquer nota fiscal com itens fracionários e está documentado no código (`calcularComposicao` em `packages/api/src/services/calculo.service.ts`).

## Pontos que dependem de confirmação com um contador (sinalizados no sistema)

- **Tabelas do Simples Nacional (Anexos I e III)**: usadas as tabelas vigentes desde 01/01/2018 (LC 123/2006, redação da LC 155/2016). Ainda vigentes no início de 2026, mas a Reforma Tributária pode alterá-las a partir de 2027 — todo resultado calculado para datas de 2027 em diante deveria ser conferido antes de ser usado para uma decisão real (o sistema já modela vigência por data, então basta cadastrar a nova tabela quando ela sair; ver `packages/engine/src/tax/simples-nacional-tabelas.ts`).
- **Limite de faturamento do MEI (R$ 81.000/ano)**: mesma ressalva — vigente desde 2018, sem confirmação de mudança pela Reforma Tributária até o momento desta entrega.
- **RBT12 = 0 / empresa nova**: ver decisão acima — a aproximação usada não é a fórmula legal exata de projeção do primeiro ano.

## Fora do escopo desta entrega (Fases 2 e 3 do prompt original)

- Ficha técnica multinível (subprodutos com ficha própria) + detecção de referência circular.
- Todos os Anexos do Simples Nacional (II, IV, V) e Fator R.
- Tipo de fornecedor e crédito tributário (custo líquido de créditos, comparação entre fornecedores).
- Histórico de preços de insumos com recálculo automático de fichas.
- Motor de vigências completo da Reforma Tributária (CBS/IBS), simulador de regime tradicional × híbrido, projeções 2027–2033.
- Exportação de PDF de orçamento e planilha para o contador.
- Lucro Presumido e Lucro Real (a interface `RegimeTributarioStrategy` já foi desenhada para comportar novas estratégias sem alterar o motor).
- Integração com Firebase (Auth + Firestore) — combinado como próximo passo, aguardando as credenciais do usuário.
