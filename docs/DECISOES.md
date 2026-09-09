# Decisões de modelagem e pontos em aberto

O prompt original pede explicitamente para "questionar premissas ambíguas em vez de assumir silenciosamente" e "sinalizar todo ponto onde a legislação ainda depende de regulamentação". Como o MVP foi construído numa única sessão (a pedido do usuário, priorizando ter algo funcional rapidamente em vez de rodadas de perguntas a cada etapa), este documento registra as decisões tomadas no lugar de perguntas, para que fiquem visíveis e revisáveis.

## Decisões de modelagem

**Stack**: Angular + TypeScript, sem backend próprio — combinado com o usuário. O motor de cálculo (TypeScript puro) roda direto no navegador, dentro do Angular; o Firestore substitui tanto o banco de dados quanto a API que existiam numa primeira versão (Node/Express), removida quando essa decisão foi tomada. Ver a seção "Sem backend" abaixo.

**Sem backend (Firestore + Auth direto do Angular).** A primeira versão deste sistema tinha uma API Node/Express entre o Angular e o banco de dados. O usuário pediu explicitamente para eliminar essa camada: o Angular fala direto com o Firestore pelo SDK do navegador, e o motor de cálculo (que já era TypeScript puro, sem dependência de Node) passou a ser importado direto pelo Angular em vez de rodar num servidor. Consequências assumidas conscientemente:
- **`firestore.rules` vira a única linha de defesa dos dados** — não existe mais uma camada de validação/autorização de servidor. As regras isolam tudo por `uid` autenticado (`users/{uid}/...`).
- **Sem auto-cadastro de usuários.** Como é um app de uso pessoal/de uma empresa (não um produto multi-cliente), a tela de login não tem "criar conta" — o usuário cria seu próprio acesso no Console do Firebase (Authentication → Users). Abrir cadastro público exigiria pensar em confirmação de e-mail, abuso de quota, etc., fora do escopo pedido.
- **Sem seed de dados de demonstração**: o backend antigo populava dados de exemplo ao subir; sem servidor, isso não existe mais — o usuário cadastra os próprios dados pela interface desde o primeiro acesso.
- **Regras fiscais (tabelas do Simples/MEI) continuam sendo config estática do próprio motor de cálculo** (não viram documentos no Firestore no MVP) — atualizar uma tabela para uma vigência nova ainda é uma alteração de código em `packages/engine/src/tax/*-tabelas.ts`, publicada com o próximo deploy do front. Levar isso para o Firestore (editável sem redeploy) é uma melhoria possível de fase futura, não feita agora para não aumentar o escopo desta migração.

**DAS-MEI não é calculado pelo sistema.** O valor muda todo mês de janeiro (é indexado ao salário mínimo) e sua composição exata (INSS 5% + ICMS R$1 e/ou ISS R$5) é fácil de errar. Decisão: pedir o valor como **entrada do usuário** (ele confere no gerador de boleto do Portal do Empreendedor), em vez de tentar adivinhar um número que ficaria desatualizado ou errado. Isso respeita a restrição do prompt de nunca hardcodar alíquota — e um valor "chutado" seria pior que pedir a entrada.

**RBT12 = 0 (empresa em início de atividade).** A regra legal correta é usar a média aritmética dos meses de atividade para projetar a receita bruta dos 12 meses. O MVP simplifica isso usando a alíquota **nominal** da 1ª faixa do anexo como aproximação conservadora, e sinaliza isso explicitamente no memorial de cálculo e em um alerta. Ponto para refinar na Fase 2, com um contador confirmando a regra de projeção correta caso a caso.

**Rateio de custo fixo por tempo de produção** foi implementado recebendo o mix completo de produtos (ficha técnica + volume estimado de cada um) como parâmetro da chamada de cálculo, e não como um estado persistido de "plano de produção mensal". Trade-off consciente para não introduzir uma entidade nova (plano de produção) que o prompt não pediu explicitamente no MVP.

**Precificar um insumo direto, sem precisar criar uma ficha técnica.** Depois de usar o modo "Revenda" da ficha técnica, o usuário pediu algo ainda mais direto: para um item de revenda simples (ex.: 1 corte de carne), não quer nem esse passo extra de salvar uma ficha — quer escolher o insumo direto na tela de cálculo. `PricingService.calcularPreco` aceita `insumoId` como alternativa a `fichaTecnicaId`: monta uma "ficha técnica" sintética em memória (1 item, rendimento 1), sem nada persistido no Firestore. Continua reaproveitando 100% do motor de cálculo — só muda de onde vêm os dados de entrada.

**Revenda (produto pronto, sem receita) reaproveita o modelo de ficha técnica existente, sem mudar o motor de cálculo.** Pedido do usuário para atender quem compra pronto e revende (ex.: açougue que compra carne e revende no balcão), sem ter que "pensar em receita". Mecanicamente, revenda já era representável no modelo antigo — uma ficha técnica com exatamente 1 insumo e rendimento 1 — porque a perda no corte/porcionamento já mora no `percentualPerda` do próprio `Insumo`. A mudança foi só de UX: `FichaTecnica` ganhou um campo opcional `tipo: 'receita' | 'revenda'` (ausente em documentos antigos = tratar como 'receita'), e a tela trava em 1 insumo + rendimento 1 e troca os rótulos quando `tipo = 'revenda'`. `packages/engine` não mudou uma linha.

**Composição do preço para relatório é só dado de exibição.** Os valores de matéria-prima/embalagem/mão de obra/tributos etc. que aparecem na barra de composição são calculados em `Decimal` (precisão arbitrária) e não passam por arredondamento a centavos — a soma deles pode ficar 1 centavo diferente do preço de venda final (que É arredondado). Isso é o mesmo comportamento de qualquer nota fiscal com itens fracionários e está documentado no código (`apps/web/src/app/services/pricing.service.ts`).

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
- Auto-cadastro de novos usuários (signup) — por decisão deliberada, não só por escopo; ver "Sem backend" acima.
- Tabelas fiscais editáveis via Firestore sem redeploy (hoje são config estática do motor de cálculo).
