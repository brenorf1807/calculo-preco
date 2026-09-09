# Memorial de cálculo e fontes legais

## Por que existe

Todo resultado de `calcularPrecoVenda` / `calcularPrecoPorCanais` (em `packages/engine/src/pricing/price-calculator.ts`) carrega um array `memorial: LinhaMemorial[]` com cada etapa do cálculo, a fórmula usada e — quando aplicável — a regra fiscal e a fonte legal aplicada. `PricingService` (`apps/web/src/app/services/pricing.service.ts`) expõe isso em `resultado.memorial` e o frontend mostra em "Ver memorial de cálculo" na tela de cálculo. Isso é o que permite ao usuário confiar no número e a um contador conferir — é requisito do prompt original, não um extra.

## Onde cada regra fiscal está e sua fonte

| Regra | Arquivo | Fonte legal |
|---|---|---|
| DAS-MEI (custo fixo, não percentual) | `packages/engine/src/tax/mei.strategy.ts` | Valor informado pelo usuário (Portal do Empreendedor) — o sistema não o calcula, ver `docs/DECISOES.md` |
| Limite de faturamento do MEI (R$ 81.000/ano) | `packages/engine/src/tax/mei-tabelas.ts` | LC 123/2006, art. 18-A, §1º (redação da LC 155/2016), vigente desde 01/01/2018 |
| Alíquota efetiva do Simples Nacional, Anexo I | `packages/engine/src/tax/simples-nacional-tabelas.ts` | LC 123/2006, Anexo I (redação da LC 155/2016), vigente desde 01/01/2018 |
| Alíquota efetiva do Simples Nacional, Anexo III | `packages/engine/src/tax/simples-nacional-tabelas.ts` | LC 123/2006, Anexo III (redação da LC 155/2016), vigente desde 01/01/2018 |
| Fórmula da alíquota efetiva | `packages/engine/src/tax/simples-nacional.strategy.ts` | LC 123/2006, art. 18, §1º-A: `((RBT12 × Alíquota Nominal) − Parcela a Deduzir) ÷ RBT12` |

Todas as regras são armazenadas com `vigenciaInicio`/`vigenciaFim` e acessadas apenas através de `TaxRuleRepository` (`packages/engine/src/tax/tax-rule-repository.ts`) — o motor de cálculo nunca lê uma tabela ou constante fiscal diretamente, sempre pede ao repositório "qual regra vale nesta data". Isso é o que permite adicionar a tabela pós-2027 da Reforma Tributária sem tocar no motor.

## Política de arredondamento (onde e como)

**Dinheiro nunca é ponto flutuante.** `Money` (`packages/engine/src/domain/money.ts`) guarda centavos como `BigInt` e usa `decimal.js` (precisão arbitrária, base 10) para as contas intermediárias — nunca `float`/`double`. Arredondamento é sempre **HALF_UP**, 2 casas decimais.

Pontos de arredondamento, documentados no código onde ocorrem:

1. **Custo unitário de um insumo** (`Insumo.custoUnitario()`) e a agregação de uma ficha técnica (`FichaTecnica.custoTotalInsumos`/`custoInsumosPorUnidade`) **retornam `Decimal`, não `Money`** — de propósito. O custo por grama/mL de um insumo é rotineiramente menor que 1 centavo (ex.: farinha a R$6,50/5kg custa ≈R$0,0013/g). Uma implementação que arredondasse a cada item zeraria esse custo — foi exatamente o bug encontrado e corrigido durante o desenvolvimento deste MVP (ver teste de regressão `"NÃO perde custo de insumos fracionários de centavo"` em `packages/engine/test/ficha-tecnica.test.ts`).
2. **Único ponto de arredondamento do custo direto**: a camada de orquestração (`executarCalculoPreco` em `apps/web/src/app/services/pricing.service.ts`) soma matéria-prima + embalagem + mão de obra em `Decimal` e só então chama `Money.fromReais(...)` **uma vez**, exatamente onde esse valor entra na fórmula de precificação.
3. **Preço de venda final**: `calcularPrecoVenda` (motor) arredonda ao dividir o numerador (Money) pelo denominador — esse é o preço que o usuário vê e que deve fechar em centavos.
4. **Composição do preço para relatório** (a barra de "quanto é matéria-prima / mão de obra / tributos / lucro") fica inteiramente em `Decimal`, sem arredondar — é dado de exibição, não entra em nenhuma conta posterior, e a soma dos componentes pode ficar 1 centavo diferente do preço de venda arredondado (mesmo efeito de qualquer nota fiscal com itens fracionários).

## Como auditar um cálculo

1. Na tela "Calcular preço de venda", clique em "Ver memorial de cálculo" no card do canal desejado.
2. Cada linha mostra a descrição da etapa, a fórmula usada, o valor resultante e — quando é uma regra fiscal — a regra aplicada e a fonte legal.
3. Para conferir com um contador, exporte essa tabela (a exportação em PDF/planilha está no escopo da Fase 3).
