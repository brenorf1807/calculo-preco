# Cálculo de Preço

Sistema de formação de preço de venda para MEIs, microempresas e empresas de pequeno porte no Brasil — cálculo "por dentro" (nunca markup simples), com motor tributário parametrizável para MEI e Simples Nacional (Anexos I e III).

Este é o **MVP (Fase 1)**, conforme o escopo faseado do prompt original. Ver [`docs/DECISOES.md`](docs/DECISOES.md) para as decisões de modelagem tomadas e os pontos que ainda dependem de validação com um contador, e [`docs/MEMORIAL-DE-CALCULO.md`](docs/MEMORIAL-DE-CALCULO.md) para as fontes legais de cada regra e a política de arredondamento.

## Arquitetura — sem backend próprio

**Não existe servidor Node em produção.** O Angular fala direto com o Firebase (Authentication + Firestore) pelo SDK do navegador. Não há nada para hospedar além de arquivos estáticos.

```
packages/engine/   Motor de cálculo — domínio puro, TypeScript, sem framework/banco/UI.
                    Money (centavos, decimal.js), Percentage, entidades (Insumo, FichaTecnica,
                    CustoFixoMensal, CanalVenda), motor tributário (Strategy: MeiStrategy,
                    SimplesNacionalStrategy) com regras versionadas por vigência, fórmula de
                    precificação "por dentro", break-even, análise de sensibilidade.
                    47 testes unitários (vitest), incluindo casos de fronteira.
                    Empacotado e importado direto pelo Angular (roda no navegador).

apps/web/           Frontend Angular 19 (standalone components) — a aplicação inteira.
                    - Firebase Authentication (e-mail/senha) protege as telas via `authGuard`.
                    - Firestore guarda os dados em `users/{uid}/<colecao>` — cada usuário só
                      enxerga os próprios dados (ver `firestore.rules` na raiz).
                    - `ApiService` fala com o Firestore; `PricingService` chama o motor de
                      cálculo (`@calculo-preco/engine`) inteiramente no navegador.
                    - Telas de cadastro (insumos, fichas técnicas, custos fixos, canais de
                      venda, empresa/regime) e a tela de cálculo com composição do preço em
                      barra, ponto de equilíbrio e memorial de cálculo.

firestore.rules     Regras de segurança do Firestore — a ÚNICA barreira de acesso aos dados,
                    já que não há backend para validar nada. Ver "Segurança" abaixo.
```

O motor de cálculo (`packages/engine`) não importa nada de framework — é testável isoladamente e é o único lugar onde a lógica de precificação e tributação vive, mesmo rodando dentro do Angular. Isso é o que o prompt original pede explicitamente ("Separe rigorosamente o motor de cálculo... O motor deve ser testável isoladamente").

## Rodando localmente

```bash
npm install                    # instala as dependências de todos os workspaces (engine + web)

npm run test:engine            # roda os 47 testes do motor de cálculo
npm run dev:web                # compila o engine e sobe o Angular em http://localhost:4200
```

Na primeira execução, faça login com um usuário criado no Console do Firebase (ver "Criando seu login" abaixo) — sem backend, não existe seed de dados de demonstração automático; cadastre insumos/fichas/canais pela própria interface.

## Segurança — leia antes de publicar

Sem backend, **`firestore.rules` é a única coisa protegendo os dados** (insumos, custos, margens do seu negócio). O arquivo na raiz do projeto já isola tudo por usuário autenticado (`users/{uid}/...`), mas ele só faz efeito depois de publicado:

1. Console do Firebase → **Firestore Database → Regras** → cole o conteúdo de `firestore.rules` → **Publicar**. (Ou, com o Firebase CLI: `firebase deploy --only firestore:rules`, usando o `firebase.json` já incluído.)
2. **Crie seu login**: Console do Firebase → **Authentication → Users → Add user** → informe e-mail e senha. Não existe tela de auto-cadastro no app (decisão deliberada — ver `docs/DECISOES.md`), então o primeiro (e único, no MVP) usuário é criado por você direto no console.
3. A `apiKey` e demais campos em `apps/web/src/app/firebase.ts` **não são segredo** — é assim que qualquer app web do Firebase funciona, a proteção real é a regra do passo 1 + o login do passo 2.

## Publicando (Firebase Hosting)

```bash
npm run build:web                        # gera apps/web/dist/web/browser
npx firebase-tools deploy --only hosting # requer login (npx firebase-tools login) e o projeto configurado
```

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
- Login por e-mail/senha (Firebase Authentication) protegendo todas as telas; dados isolados por usuário no Firestore.

**Fora do escopo desta entrega** (conforme o faseamento do prompt original): ficha técnica multinível com detecção de referência circular, Fator R e demais Anexos do Simples, tipo de fornecedor/crédito tributário, histórico de preços, motor de vigências completo da Reforma Tributária (CBS/IBS) com simulador tradicional×híbrido, exportação de PDF/planilha, auto-cadastro de novos usuários. Ver `docs/DECISOES.md` para o detalhamento.
