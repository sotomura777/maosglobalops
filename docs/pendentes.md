# Pendentes

Lista viva do que falta, atualizada a 25 set 2026. Marca `[x]` quando ficar feito. Os passos de publicação estão detalhados em [operacoes.md](operacoes.md).

## 1. Antes de lançar (depende de ti)

- [ ] **Faturação:** ativar o plano Blaze e criar um alerta de orçamento (por exemplo 10 €/mês).
- [ ] **Região do Firestore:** confirmar na consola. As funções estão em `europe-west1`; se a base de dados estiver noutra região, o gatilho dos emails tem de mudar.
- [ ] **Resend:**
  - [ ] criar a conta e verificar o domínio (DNS);
  - [ ] `firebase functions:secrets:set RESEND_API_KEY`;
  - [ ] criar `functions/.env.maosglobalops` com `MAIL_FROM`, `APP_URL` e `ENFORCE_APP_CHECK=false`.
- [ ] **App Check:** criar a chave reCAPTCHA Enterprise e pôr `VITE_APPCHECK_SITE_KEY` no `.env`. Ligar a imposição só depois de ver as métricas.
- [ ] **Páginas legais (`src/pages/LegalPage.jsx`):**
  - [ ] preencher o responsável pelo tratamento (nome e NIF) e o email de contacto;
  - [ ] rever o texto com um jurista, incluindo a partilha de dados com as apps das empresas.
- [ ] **Publicar pela ordem do runbook:**
  1. funções;
  2. `migrate-visibility` (**antes das regras**);
  3. regras e índices;
  4. `migrate-contracting`;
  5. hosting.
- [ ] **Tornar-te admin:** `node scripts/set-admin.mjs --project maosglobalops --email … --execute`.
- [ ] **Backups:** ativar os diários com 7 dias de retenção e fazer um teste de restauro (confirmar antes a sintaxe dos comandos `gcloud`).
- [ ] **Monitorização:** alerta de erros das funções no Cloud Logging.
- [ ] **Ponte só de leitura:** conta de serviço "Cloud Datastore Viewer" no projeto da MaosOps, para o `sync-from-app --source-key`.
- [ ] **Branch:** rever e juntar o PR `feat/marketplace-migration` ao `main`.

## 2. Nunca verificado a sério (só em emuladores)

- [ ] **Emails reais:** até agora só em modo ensaio. Não tenho a certeza de que o Resend aceita o cabeçalho `Idempotency-Key`.
- [ ] **App Check** num browser real.
- [ ] **Funções agendadas:** `shiftReminders` (18:00) e `marketStats` (04:00). O cálculo está testado, mas nunca as vi correr agendadas.
- [ ] **`sync-from-app --source-key`** com uma conta de serviço real.
- [ ] **Regras de listas com `get(campo, defeito)`:** não se sabe se a produção também deixa passar documentos que deviam ser recusados. Evitámos esta forma; não voltar a usá-la.

## 3. Limites conhecidos (aceites por agora)

- **Apagar uma conta muito ativa** faz várias escritas seguidas, não uma só operação atómica. Se falhar a meio, repetir completa, mas entretanto os dados ficam meio anonimizados.
- **Suspensão:** uma sessão já aberta ainda escreve mensagens e posts durante até 1 hora.
- **Emails falhados** ficam como `failed` e não são reenviados (preferimos perder um a duplicar).
- **Canais:** os posts antigos, com data em texto, aparecem acima dos novos.
- **WhatsApp:** as pré-visualizações das ofertas partilhadas mostram só o nome da app. Resolver exige renderização no servidor.
- **Bundle inicial:** cerca de 906 KB (274 KB comprimido), quase tudo Firebase e React.
- **Ranking:** lê até 200 perfis na primeira visita de cada sessão.
- **Denúncias:** não têm limite diário no servidor, só uma por pessoa e por alvo.
- **Telefone:** só é partilhado com a empresa de app própria se a pessoa o tiver preenchido.
- **Mensagens (L1):** a pré-visualização da última mensagem pode ser falsificada por um dos dois participantes.

## 4. Ligação com a MaosOps e outras apps de empresa (quando decidires mexer)

Ver [arquitetura-empresas.md](arquitetura-empresas.md), secção "Contrato".
- [ ] Criação e remoção automáticas da conta de staff (hoje são manuais, com confirmação na GlobalOps).
- [ ] "Entrar com GlobalOps" (sem segunda password).
- [ ] `globalopsEngagementId` em cada evento da MaosOps e devolução automática do resultado (presença, horas).
- [ ] Deixar de contar a dobrar: excluir da importação agregada os trabalhos que vieram da GlobalOps.
- [ ] Uma base de código comum para as apps das empresas.

## 5. Marca (logo do Claude Design, 26 set)

- [x] Ícones da app, favicon legível a 16 px, manifest e imagem de partilha, em preto e dourado. Para os gerar outra vez: `node scripts/brand/render-assets.mjs`.
- [ ] Pôr o logo na interface (tema escuro): barra de topo, login e registo, carregamento, página inicial e rodapé, página pública da oferta. O componente já está em `src/brand/GlobalOpsLogo.jsx`.
- [ ] Modo claro (branco, bordeaux e dourado): tema em toda a app, com escolha do utilizador e o logo no tema `light`.
- [ ] Se a app passar a ter domínio próprio, atualizar o `og:image` no `index.html`.

## 6. Produto — próximos passos possíveis

- [ ] Disputas de presenças (v2).
- [ ] Métricas de percurso no admin (registo → candidatura → contratação).
- [ ] Contas de empresa com vários membros e papéis.
- [ ] Avisos no telemóvel (PWA e push).
- [ ] Disponibilidade por intervalo e calendário.
- [ ] Pagamentos pela plataforma (só depois de validar o resto).
