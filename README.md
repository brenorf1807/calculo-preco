# Cálculo de Preço

Sistema de formação de preço de venda para MEIs, microempresas e empresas de pequeno porte no Brasil — cálculo "por dentro" (nunca markup simples), com motor tributário parametrizável para MEI e Simples Nacional (Anexos I e III).

Este é o **MVP (Fase 1)**, conforme o escopo faseado do prompt original. Ver [`docs/DECISOES.md`](docs/DECISOES.md) para as decisões de modelagem tomadas e os pontos que ainda dependem de validação com um contador, e [`docs/MEMORIAL-DE-CALCULO.md`](docs/MEMORIAL-DE-CALCULO.md) para as fontes legais de cada regra e a política de arredondamento.

## Arquitetura

Monorepo com 3 pacotes, npm workspaces:

```
packages/engine/   Motor de cálculo — domínio puro, TypeScript, sem framework/banco/UI.
                    Money (centavos, decimal.js), Percentage, entidades (Insumo, FichaTecnica,
                    CustoFixoMensal, CanalVenda), motor tributário (Strategy: MeiStrategy,
                    SimplesNacionalStrategy) com regras versionadas por vigência, fórmula de
                    precificação "por dentro", break-even, análise de sensibilidade.
                    47 testes unitários (vitest), incluindo casos de fronteira.

packages/api/       API REST (Express + TypeScript). Repositórios em memória atrás de uma
                    interface `Repository<T>` — o ponto de troca para o Firebase (ver abaixo).
                    Orquestra o motor de cálculo: monta insumos/ficha/canal a partir dos
                    registros salvos e chama `packages/engine`.

apps/web/           Frontend Angular 19 (standalone components). Telas de cadastro (insumos,
                    fichas técnicas, custos fixos, canais de venda, empresa/regime) e a tela
                    de cálculo de preço com composição do preço em barra, ponto de equilíbrio,
                    sensibilidade de volume e memorial de cálculo.
```

O motor de cálculo (`packages/engine`) não importa nada de `express`, banco de dados ou Angular — é testável isoladamente e é o único lugar onde a lógica de precificação e tributação vive. Isso é o que o prompt original pede explicitamente ("Separe rigorosamente o motor de cálculo... O motor deve ser testável isoladamente").

## Rodando localmente

```bash
npm install                    # instala as dependências de todos os workspaces

npm run test:engine            # roda os 47 testes do motor de cálculo
npm run build:engine           # compila o motor (necessário antes de rodar a API)
npm run build:api              # compila a API
npm run dev:api                # sobe a API em http://localhost:3000 (com watch)

cd apps/web && npm install && npm start   # instala e sobe o frontend Angular em http://localhost:4200
```

A API já sobe com **dados de demonstração** (MEI, um produto de exemplo, 3 canais de venda) na primeira execução, para o frontend funcionar "out of the box". Desligue com `SEED_DEMO_DATA=false`.

## Integração com Firebase (próximo passo, combinado com o usuário)

O sistema foi desenhado para essa migração ser mecânica:

- `packages/api/src/repositories/repository.ts` define `Repository<T>` (list/get/create/update/delete). Hoje só existe `InMemoryRepository<T>`; a integração troca isso por um `FirestoreRepository<T>` que implementa a mesma interface — **nenhuma rota HTTP muda**.
- Os "records" (`packages/api/src/records/types.ts`) já são objetos JSON puros (sem classes), no formato que uma collection do Firestore guardaria. Os comentários em `store.ts` já nomeiam as collections previstas: `insumos`, `fichasTecnicas`, `despesasFixas`, `canaisVenda`, `empresa/config`.
- O MVP é single-tenant (uma empresa por instância). Quando o Firebase Auth entrar, multi-tenancy vira "escopar cada collection por `uid` do usuário autenticado" — não uma reescrita do domínio.
- Quando as credenciais forem fornecidas, a mudança fica contida em `packages/api` (repositórios + autenticação); `packages/engine` não muda.

## Escopo desta entrega (Fase 1 / MVP)

- Cadastro de insumos (com conversão de unidade de compra→consumo e perda técnica) e embalagens.
- Ficha técnica de 1 nível (sem subprodutos ainda — isso é Fase 2).
- Mão de obra direta (manual ou derivada de pró-labore ÷ horas produtivas).
- Custo fixo mensal com rateio por volume **ou** por tempo de produção, ponto de equilíbrio e análise de sensibilidade (70%/100%/130% do volume).
- Múltiplos canais de venda, cada um com taxas percentuais e taxas fixas por pedido, com um preço calculado por canal a partir da mesma ficha técnica.
- Motor tributário: **MEI** (DAS tratado como custo fixo, nunca como percentual) e **Simples Nacional Anexos I e III** (fórmula oficial da alíquota efetiva, tabelas versionadas por vigência).
- Fórmula de precificação "por dentro" com validação explícita de preço matematicamente impossível (nunca retorna número negativo/infinito).
- Modo de engenharia reversa (dado um preço de mercado, qual a margem líquida real).
- Memorial de cálculo auditável em cada resultado (regra aplicada + fonte legal).
- Todo resultado carrega o aviso legal de que é estimativa e não substitui um contador.

**Fora do escopo desta entrega** (conforme o faseamento do prompt original): ficha técnica multinível com detecção de referência circular, Fator R e demais Anexos do Simples, tipo de fornecedor/crédito tributário, histórico de preços, motor de vigências completo da Reforma Tributária (CBS/IBS) com simulador tradicional×híbrido, exportação de PDF/planilha. Ver `docs/DECISOES.md` para o detalhamento.
