# MaosGlobalOps

Mercado de serviços para profissionais independentes e empresas de eventos e restauração. React, Vite, Firebase Authentication e Firestore.

## Percursos

- Trabalhador: perfil e disponibilidade → pesquisa/guardados → candidatura → confirmação da proposta → conversa privada → confirmação da conclusão → avaliação da empresa.
- Empresa: perfil próprio → rascunho → pré-visualização → publicação com condições completas → seleção dos candidatos → pedido de confirmação da realização → avaliação do profissional.
- Candidaturas: `pending → accepted → confirmed → completion_requested → completed`. A empresa pode recusar; os participantes podem cancelar antes do pedido de conclusão, com motivo. O trabalhador pode devolver o pedido de conclusão para correção.
- Ofertas encerradas não recebem novas candidaturas. As condições publicadas não se alteram e o histórico mantém-se. O número de vagas é o número anunciado; a empresa gere as confirmações e encerra a oferta quando estiver preenchida.
- Notificações dentro da app, em tempo real, com estado de leitura por contratação. A conversa serve também para combinar alterações ao horário. Não existem envios de email ou push.
- Avaliações únicas por participante, apenas depois da conclusão bilateral. Os selos e validações importados ficam separados das avaliações GlobalOps.

## Interface e usabilidade

- Início com ações pendentes, próximo trabalho e ofertas relevantes.
- Pesquisa com filtros num painel móvel, filtros ativos removíveis e estimativa de pagamento para o horário anunciado.
- Perfil apresentado em resumo e editado por secção, com aviso antes de abandonar alterações.
- Trabalhos separados entre resposta necessária, espera, confirmados e histórico; empresas consultam contadores e candidatos por oferta.
- Rascunhos privados em `profiles/{uid}/jobDrafts`. A publicação e remoção do rascunho usam uma operação atómica. Duplicar copia condições e exige nova data.
- Conversas com prévia, data e leitura separada das mudanças de estado.
- Ganhos com resumo compacto e formulário aberto apenas quando necessário.

## Desenvolvimento

`npm install`, `npm ci --prefix functions` e `npm run dev`. As variáveis `VITE_FIREBASE_*` configuram o projeto. Nunca ativar os emuladores num build destinado a produção.

## Validação local isolada

Requer Firebase CLI, Java 21 e um navegador Playwright instalado (`npx playwright install chromium`).

- `npm test`: modelo, identidade e calendário com fusos horários.
- `npm run test:contracting`: transações no servidor e confirmações concorrentes (emulador necessário).
- `npm run test:emulators`: inicia os emuladores no projeto **demo-globalops**, testa permissões e executa o percurso no navegador.
- Com os emuladores já iniciados: `npm run test:rules` seguido de `npm run test:e2e`.
- `npm run build`: build de produção.

Em macOS com Java 21 via Homebrew, acrescentar `/opt/homebrew/opt/openjdk@21/bin` ao PATH. É possível indicar um Chromium já instalado com `PLAYWRIGHT_CHROMIUM_EXECUTABLE`.

Os testes do navegador limpam exclusivamente a base do emulador `demo-globalops`. Criam contas de demonstração, percorrem registo/publicação/candidatura/contratação/mensagens/avaliações e verificam overflow em dez páginas num viewport de 390px. Imagens e traces ficam em `test-results/`.

## Dados e permissões

`profiles` guarda os dados privados da conta; `publicProfiles` guarda apenas os campos de apresentação autorizados; `jobs` as ofertas; `engagements` as candidaturas e contratações; `engagements/{id}/messages` as conversas; `reviews` as avaliações. Guardados e leituras ficam em subcoleções privadas do perfil, tal como o registo de ganhos.

As regras controlam cada transição e impedem falsificar participantes, alterar condições de ofertas ou atribuir selos de validação. A identificação das empresas é declarada, sem selo automático de verificação. Só a apresentação em `publicProfiles` é legível por outros utilizadores autenticados, quando pública. Email, telefone e consentimentos ficam em `profiles`, acessível apenas ao titular. Alterar a visibilidade exige atualizar os dois documentos atomicamente. As validações importadas são acessíveis ao titular ou quando o perfil é público. As avaliações de contratações permanecem legíveis dentro da plataforma.

## Atualização de uma instalação existente

A interface antiga não volta a publicar candidaturas. Para trazer as candidaturas antigas para o novo percurso da empresa e do trabalhador, há uma migração que não apaga nem modifica documentos antigos e nunca substitui uma contratação existente:

```sh
node scripts/migrate-marketplace.mjs --project maosglobalops
node scripts/migrate-marketplace.mjs --project maosglobalops --execute
```

A primeira execução é só uma pré-visualização de contagens. A execução real requer credenciais administrativas do projeto GlobalOps. Antes da publicação, rever as contagens e executar a migração; publicar as regras `firestore.rules` juntamente com o frontend. A versão nova depende dessas regras para mensagens, contratações e avaliações. Não publicar apenas o hosting com as regras anteriores.

## Privacidade e contas — fase 1

Publicar ofertas e enviar candidaturas exige `email_verified` no token Firebase; a exploração, rascunhos e gestão do perfil continuam disponíveis antes da confirmação. Em **Segurança da conta**, o titular pede a confirmação e atualiza a sessão depois de abrir a ligação. A recuperação está em `/recuperar-password`; as ligações são tratadas pelo Firebase Auth e regressam à app. Não há envio automático a contas existentes.

O importador **da GlobalOps**, `scripts/sync-from-app.mjs`, exige consentimento `importExperience`, conta Auth ativa e email verificado coincidente. Revalida antes de escrever e recusa transferir um comprovativo existente para outro titular. Desativar consentimento impede novas sincronizações; não elimina histórico. A associação confirma posse do email, não a identidade legal da pessoa. Os projetos MaosOps não são modificados.

Migração para instalações existentes (credenciais Admin da GlobalOps):

```sh
node scripts/migrate-public-profiles.mjs --project maosglobalops
firebase deploy --only firestore:rules --project maosglobalops
node scripts/migrate-public-profiles.mjs --project maosglobalops --execute
npm run build
firebase deploy --only hosting --project maosglobalops
```

A primeira execução apresenta apenas contagens. A migração é idempotente, relê cada perfil numa transação e não remove dados privados. Publicar as regras primeiro fecha o acesso antigo; durante a migração, o diretório pode ficar temporariamente incompleto e clientes antigos podem precisar de atualizar. Não reverter para regras que tornem `profiles` públicos. Confirmar os domínios autorizados e os modelos de email na consola Firebase antes de disponibilizar novos domínios.

Vagas, conflitos de horário e datas no servidor estão implementados localmente na fase 2, pendente de ativação da faturação e publicação das funções. Ainda por implementar: disputas, monitorização operacional e recuperação de desastre. O relatório em `docs/research/globalops` representa o diagnóstico anterior a estas correções.


## Fase 2 — preparada, ainda não publicada

As alterações atuais de contratação dependem da função `contracting`. **Não publicar apenas o hosting ou apenas as regras**: a produção continua na fase 1. O projeto foi consultado e tem `billingEnabled=false`; a ativação de faturação requer decisão do titular. Ver [plano de publicação e comportamento](docs/releases/2026-09-17-contratacoes.md).

Para testar, iniciar os emuladores de Auth, Firestore **e Functions**, com projeto `demo-globalops` e `firebase.test.json`. `npm run test:emulators` executa sequencialmente permissões, transações e navegador para não limpar a base enquanto outro teste a usa. O relógio injetável só existe nos testes unitários do servidor; a função publicada usa sempre o relógio real.
