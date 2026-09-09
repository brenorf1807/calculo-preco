# Deploy — Firestore rules + Firebase Hosting

Sem backend, quem publica as regras do Firestore e o app é você (ou o GitHub Actions em seu nome) — eu não tenho nenhuma credencial da sua conta Google/Firebase, só a config pública do app. Este documento tem duas seções: o caminho rápido (fazer agora, manualmente, 2 minutos) e o caminho automático (GitHub Actions, deploy a cada push).

## Caminho rápido — publicar agora, sem esperar o GitHub Actions

**Regras do Firestore** (obrigatório para o app funcionar):
1. https://console.firebase.google.com/project/precificando-eb48f/firestore/rules
2. Apague o conteúdo do editor e cole o conteúdo de [`firestore.rules`](../firestore.rules) (na raiz deste repo).
3. Clique em **Publicar**.

**Seu login** (obrigatório para conseguir entrar no app):
1. https://console.firebase.google.com/project/precificando-eb48f/authentication/users
2. **Add user** → seu e-mail e uma senha.

Com essas duas coisas feitas, o app já funciona assim que estiver publicado em algum lugar (Firebase Hosting, ou até rodando local com `npm run dev:web`).

## Caminho automático — GitHub Actions (`.github/workflows/deploy-firebase.yml`)

Já commitei o workflow. Ele publica as regras do Firestore **e** o Hosting a cada push nas branches `main`/`claude/github-mobile-development-wmbfgb`, ou manualmente pela aba **Actions** do GitHub ("Run workflow"). Falta só uma coisa, que só você consegue fazer (exige acesso à sua conta Google):

### 1. Criar a service account no Google Cloud

1. Acesse: https://console.cloud.google.com/iam-admin/serviceaccounts?project=precificando-eb48f
2. **+ CRIAR CONTA DE SERVIÇO**. Nome sugerido: `github-actions-deploy`.
3. Em "Conceder acesso a este projeto", adicione estes papéis:
   - **Firebase Hosting Admin** (`roles/firebasehosting.admin`)
   - **Firebase Rules Admin** (`roles/firebaserules.admin`) — necessário para publicar `firestore.rules`
   - **API Keys Viewer** (`roles/serviceusage.apiKeysViewer`)
   - **Firebase Authentication Admin** (`roles/firebaseauth.admin`)
4. Concluir.

### 2. Gerar a chave (arquivo JSON)

1. Na lista de contas de serviço, clique na que você acabou de criar → aba **Chaves** → **Adicionar chave** → **Criar nova chave** → tipo **JSON** → Criar. Um arquivo `.json` é baixado no seu computador.

### 3. Colar a chave como Secret no GitHub

1. No GitHub: `brenorf1807/calculo-preco` → **Settings → Secrets and variables → Actions → New repository secret**.
2. Nome: `FIREBASE_SERVICE_ACCOUNT`
3. Valor: abra o `.json` baixado no passo 2 num editor de texto, copie o conteúdo inteiro e cole aqui.
4. **Add secret**.

### 4. Disparar o deploy

- Qualquer novo push nas branches configuradas dispara sozinho, ou
- GitHub → aba **Actions** → workflow **"Deploy to Firebase"** → **Run workflow**.

Depois de configurado uma vez, todo push (ou clique manual) publica sozinho — regras do Firestore e o site — sem precisar de mim nem do Firebase CLI local.

### Onde o app fica publicado

Firebase Hosting usa por padrão `https://<project-id>.web.app` e `https://<project-id>.firebaseapp.com`, ou seja: **https://precificando-eb48f.web.app**.
