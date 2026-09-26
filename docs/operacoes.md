# Operações — publicação, administração e recuperação

Manual para pôr a fase 2 em produção e mantê-la a funcionar. Tudo o que está aqui foi testado nos emuladores, exceto os passos marcados **(consola)**, que só existem no projeto real.

## 1. Antes da primeira publicação

1. **Faturação (consola).** Ativar o plano Blaze no projeto `maosglobalops`. Criar logo um alerta de orçamento em Google Cloud → Faturação → Orçamentos e alertas, por exemplo 10 € por mês com avisos a 50 %, 90 % e 100 %. O alerta avisa, mas não corta o serviço.
2. **Localização do Firestore (consola).** Confirmar em Firestore → Definições. As funções estão em `europe-west1`. Se a base estiver em `eur3` ou em `europe-west1`, está tudo bem. Se estiver noutra região, o gatilho `engagementMail` tem de passar para essa região (`functions/index.js`).
3. **Resend.**
   - Criar conta em resend.com e verificar o domínio de envio. São registos DNS no teu fornecedor de domínio.
   - Criar uma chave de API só com permissão de envio.
   - Guardar a chave: `firebase functions:secrets:set RESEND_API_KEY --project maosglobalops`. Cola a chave quando for pedida. Nunca a ponhas em ficheiros.
   - Criar `functions/.env.maosglobalops`, sem segredos:
     ```
     MAIL_FROM=GlobalOps <avisos@o-teu-dominio.pt>
     APP_URL=https://maosglobalops.web.app
     ENFORCE_APP_CHECK=false
     ```
4. **App Check (consola).**
   - Em App Check, registar a app web com reCAPTCHA Enterprise.
   - Pôr a chave de site no `.env` da raiz: `VITE_APPCHECK_SITE_KEY=...`. É pública, tal como as outras `VITE_*`.
   - Não ligar ainda a imposição (ver secção 4).
5. **Páginas legais.** `/privacidade` e `/termos` são rascunhos (`src/pages/LegalPage.jsx`). Antes de lançar:
   - preencher o responsável pelo tratamento (nome e NIF) e o email de contacto no topo do ficheiro;
   - rever o texto com um jurista;
   - confirmar a região do Firestore, se quiseres dizer na política que os dados ficam na UE.
6. **Verificação local:**
   ```sh
   npm ci && npm ci --prefix functions
   npm test && npm run test:emulators && npm run build
   ```

## 2. Publicar (por esta ordem)

```sh
firebase deploy --only functions --project maosglobalops
node scripts/migrate-visibility.mjs --project maosglobalops            # ensaio
node scripts/migrate-visibility.mjs --project maosglobalops --execute  # ANTES das regras: sem o campo, as ofertas saem do Explorar
firebase deploy --only firestore:rules,firestore:indexes --project maosglobalops
node scripts/migrate-contracting.mjs --project maosglobalops            # ensaio: rever contagens
node scripts/migrate-contracting.mjs --project maosglobalops --execute
firebase deploy --only hosting --project maosglobalops
```

- **Índices:** podem levar alguns minutos a ficar prontos. Até lá, o Explorar, as aprovações e as denúncias do admin podem dar erro. O estado aparece em Firestore → Índices.
- **Funções publicadas:**
  - `contracting`: contratações;
  - `admin`: área de administração;
  - `engagementMail`: emails a cada mudança de estado;
  - `shiftReminders`: todos os dias às 18:00 de Lisboa.
- **Não publicar só uma parte:** o site novo depende das regras e das funções novas.

## 3. Conta de administração

```sh
node scripts/set-admin.mjs --project maosglobalops --email o-teu@email.pt            # ensaio
node scripts/set-admin.mjs --project maosglobalops --email o-teu@email.pt --execute
```

- A conta tem de ter o email confirmado.
- Depois de correr o script, sai e volta a entrar: aparece o escudo no topo e **Administração** no menu.
- Para retirar o acesso: repetir com `--revoke --execute`.
- Recomendado: uma conta só para administrar, separada da tua conta de trabalhador ou empresa.

### Validar uma empresa

Em **Administração → Empresas → Por validar**:
1. Confirmar o NIF, por exemplo no portal das Finanças ou no registo comercial, o site e um contacto.
2. Escrever a nota interna. Fica só na administração.
3. Validar ou recusar.

Só as empresas validadas mostram o selo e conseguem confirmar trabalhos passados. Os trabalhos concluídos na app com empresas por validar aparecem como "Concluído na app", sem o selo "Verificado".

### Empresa com app própria (MaosOps, Btrust…)

Em **Administração → Empresas → Validadas**, preencher "App própria (nome)" e "Endereço da app" (https) e guardar. Para retirar, deixar o nome vazio e guardar.

A partir daí:
- a candidatura a ofertas dessa empresa avisa que, se a pessoa for aceite, é criada conta de staff na app;
- cada aceitação aparece à empresa em **Staff para a {app}**, no menu lateral e no início;
- a empresa cria a conta na sua app e carrega em "Já criei a conta";
- se a pessoa recusar antes de trabalhar, aparece em "Apagar na {app}": a empresa apaga a conta e confirma.

Ver `docs/arquitetura-empresas.md`.

**Ponte só de leitura (consola, uma vez):**
1. No projeto da app da empresa, criar uma conta de serviço só com a função "Cloud Datastore Viewer".
2. Gerar uma chave JSON e guardá-la fora do repo, ou com nome `*-key.json`, que o git ignora.
3. Correr:
   ```sh
   node scripts/sync-from-app.mjs --project maosglobalops --app maosops --company "Mãos" --source-key ~/chaves/maosops-reader-key.json
   ```

### Favoritos, convites e ofertas privadas

- As empresas guardam profissionais nos favoritos (no perfil de cada um) e, ao publicar, escolhem quem convidar.
- **Pública:** aparece a todos; os favoritos escolhidos recebem um convite na app e por email.
- **Privada:** só os convidados a veem e se podem candidatar. Não tem ligação pública.
- Um convite não é uma contratação: o convidado candidata-se e a empresa escolhe, como em qualquer oferta.

### Tratar uma denúncia

Em **Administração → Denúncias**:
1. Ler o contexto e abrir o perfil ou a oferta.
2. Escrever a decisão. É obrigatória e fica registada.
3. Escolher a ação:
   - "Marcar como resolvida" basta quando não há nada a fazer;
   - "Encerrar oferta" para ofertas fraudulentas;
   - "Suspender conta do visado" nos casos graves.

Cada ação fica em `adminLog`: quem fez, o quê e quando.

### Suspender ou reativar

Em **Administração → Contas**, procurar pelo email. A suspensão:
- bloqueia o login;
- termina as sessões abertas;
- esconde o perfil;
- recusa operações no servidor.

**Limite conhecido:** uma sessão já aberta pode ainda escrever mensagens durante até 1 hora, até o token expirar. Reativar devolve o acesso, mas o perfil só volta a ser público quando o titular o voltar a publicar.

## 4. App Check: ligar a imposição

1. Com o site publicado com `VITE_APPCHECK_SITE_KEY`, esperar alguns dias de uso real.
2. Em App Check → APIs, ver as métricas das funções. A maior parte dos pedidos tem de aparecer como verificada.
3. Mudar `ENFORCE_APP_CHECK=true` em `functions/.env.maosglobalops` e correr `firebase deploy --only functions`.
4. Se aparecerem queixas de "não foi possível guardar", voltar a `false` e publicar de novo.

## 5. Backups e recuperação

**Backups diários (consola ou gcloud)**, com 7 dias de retenção:

```sh
gcloud firestore backups schedules create --project=maosglobalops \
  --database='(default)' --recurrence=daily --retention=7d
gcloud firestore backups list --project=maosglobalops
```

**Teste de restauro.** Fazer uma vez depois de ativar e depois de 3 em 3 meses. Um backup nunca testado não é um backup.

```sh
gcloud firestore databases restore --project=maosglobalops \
  --source-backup=projects/maosglobalops/locations/<LOCAL>/backups/<ID> \
  --destination-database=restauro-teste
```

- Confirmar na consola que `restauro-teste` tem as coleções esperadas (`profiles`, `jobs`, `engagements`) e depois apagá-la.
- O restauro cria sempre uma base nova e nunca escreve por cima da produção.
- Confirmar a sintaxe exata em cloud.google.com/firestore/docs/backups antes de correr: os comandos `gcloud` mudam entre versões.

**Recuperação de um erro recente**, sem desastre total: preferir restaurar para uma base nova e copiar só os documentos afetados, em vez de substituir tudo.

## 6. Monitorização

- **Orçamento:** o alerta da secção 1.
- **Erros das funções (consola):** em Cloud Logging, criar uma métrica a partir de logs com `severity>=ERROR` e `resource.type="cloud_run_revision"`, e um alerta por email quando passar de 5 em 10 minutos.
- **Emails:** `mailLog` guarda o estado de cada envio: `sent`, `failed`, `opted_out`, `skipped` ou `dry_run`. Um envio falhado não é repetido, para nunca duplicar. Se houver muitos `failed`, verificar a chave e o domínio no Resend.
- **Quotas:** as contas que batem no limite diário (20 publicações, 60 candidaturas, 60 confirmações de trabalhos passados) recebem uma mensagem clara. Os contadores estão em `quotas/{uid}_{dia}`.

## 7. Custos esperados no piloto

- **Grátis:** funções, Firestore e reCAPTCHA ficam dentro do escalão gratuito; o Resend é grátis até 3000 emails por mês.
- **Cêntimos por mês:** Secret Manager e armazenamento dos backups.
- **Atenção:** `maxInstances` limita a escala de cada função, mas não é um teto de custos. O alerta de orçamento é que protege.
