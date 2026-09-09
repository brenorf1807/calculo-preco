# Deploy — Firestore rules + Firebase Hosting

Sem backend, quem publica as regras do Firestore e o app é você (ou o GitHub Actions em seu nome) — eu não tenho nenhuma credencial da sua conta Google/Firebase, só a config pública do app. Este documento tem duas seções: o caminho rápido (fazer agora, manualmente, 2 minutos) e o caminho automático (GitHub Actions, deploy a cada push).

## Caminho rápido — publicar agora, sem esperar o GitHub Actions

**Regras do Firestore** (obrigatório para o app funcionar):
1. https://console.firebase.google.com/project/precificando-eb48f/firestore/rules
2. Apague o conteúdo do editor e cole o conteúdo de [`firestore.rules`](../firestore.rules) (na raiz deste repo).
3. Clique em **Publicar**.

**Seu login** (obrigatório para conseguir entrar no app):
1. https://console.firebase.google.com/project/precificando-eb48f/authentication/users
2. **Add user** → seu e-mail e uma senha. (Ou habilite login com Google — ver seção própria abaixo.)

Com essas duas coisas feitas, o app já funciona assim que estiver publicado em algum lugar (Firebase Hosting, ou até rodando local com `npm run dev:web`).

## Caminho automático — GitHub Actions (`.github/workflows/deploy-firebase.yml`) — **já configurado e funcionando**

O workflow publica as regras do Firestore **e** o Hosting a cada push nas branches `main`/`claude/github-mobile-development-wmbfgb`, ou manualmente pela aba **Actions** do GitHub ("Run workflow"). Já está rodando com sucesso desde a primeira publicação.

**Como foi configurado** (caso precise recriar num outro projeto/repo): em vez de criar uma service account nova, usamos a que o Firebase já cria automaticamente para cada projeto — `firebase-adminsdk-fbsvc@precificando-eb48f.iam.gserviceaccount.com` — e adicionamos o papel **Editor** a ela em Google Cloud Console → IAM & Admin → IAM (ela já vinha com "Agente de serviço administrativo do Firebase", que sozinho não é suficiente para deploys via CLI). A chave JSON dessa conta foi colada como o secret `FIREBASE_SERVICE_ACCOUNT` no GitHub (Settings → Secrets and variables → Actions).

### Disparar o deploy manualmente (se precisar)

- Qualquer novo push nas branches configuradas dispara sozinho, ou
- GitHub → aba **Actions** → workflow **"Deploy to Firebase"** → **Run workflow**.

### Onde o app fica publicado

**https://precificando-eb48f.web.app** (também responde em `https://precificando-eb48f.firebaseapp.com`).

## Login com Google (opcional, além de e-mail/senha)

O app já tem um botão "Entrar com Google" na tela de login, mas ele só funciona depois de você habilitar o provedor:

1. https://console.firebase.google.com/project/precificando-eb48f/authentication/providers
2. Clique em **Google** → **Ativar** → escolha um e-mail de suporte → **Salvar**.

**Atenção**: diferente do login por e-mail/senha (onde só existe usuário se você criar um no Console), habilitar o Google permite que **qualquer pessoa com conta Google** crie seu próprio login no app — cada uma cai isolada no seu próprio espaço no Firestore (não enxerga os dados de ninguém, graças a `firestore.rules`), mas passa a conseguir *usar* o app livremente. Se isso não for o que você quer (só você deveria logar), me avise que eu implemento uma lista de e-mails permitidos.
