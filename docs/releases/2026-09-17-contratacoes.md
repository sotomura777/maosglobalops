# Vagas, horários e confirmação — fase 2

Estado: implementação local; publicação dependente da ativação de faturação na GlobalOps. A fase 1 continua em produção. Não publicar o frontend ou as regras desta fase sem disponibilizar primeiro a função `contracting`.

## Comportamento

- Publicar, candidatar-se e alterar uma contratação passam pela função autenticada `contracting` (europe-west1, Node 22). Escritas diretas destes estados são recusadas pelas regras.
- Vaga garantida quando o profissional confirma; aceitar a candidatura não reserva vaga. Confirmações concorrentes disputam a mesma oferta e o mesmo bloqueio de agenda. A contagem considera confirmados, pedidos de conclusão e concluídos. Cancelar uma confirmação liberta a vaga na mesma transação.
- Um profissional não confirma serviços sobrepostos, incluindo a passagem da meia-noite. Serviços adjacentes são permitidos; não há ainda margem automática para deslocação.
- Datas validadas pelo relógio do servidor. Não se publica, aceita nem confirma depois do início; não se pede ou confirma conclusão antes do fim acordado. Continental/Madeira/Açores usam os respetivos fusos horários. Horas inexistentes ou ambíguas na mudança de hora são recusadas explicitamente.
- Confirmação regista horário, fuso, local, valor e prazo de pagamento aceites. Cada mudança cria um evento privado dos participantes. Repetir o mesmo pedido não duplica vagas nem eventos. Um ecrã desatualizado não pode substituir a mudança feita por outro participante.
- Renovação de token preserva formulários e usa credenciais atualizadas nas operações do servidor. Vagas na oferta acompanham alterações em tempo real.

## Validação concluída

35 testes passaram: 10 de modelo/identidade/calendário, 14 de regras de acesso, 9 de transações/migração e 2 percursos de navegador. O teste de concorrência executa pedidos simultâneos reais sobre o emulador Firestore. O percurso de navegador usa a função callable emulada e um ajuste administrativo exclusivo do emulador para representar a passagem do tempo. Build de produção concluído; mantém o aviso anterior sobre dimensão do bundle.

## Dados existentes e publicação

Pré-visualização em produção, sem escritas: 4 ofertas e 1 candidatura; 4 ofertas com horários incompletos, zero conflitos de agenda, zero excesso de lotação e zero contratações ocupadas sem oferta válida. Não inventar horários para registos antigos; manter histórico e permitir retirar/recusar candidaturas.

`node scripts/migrate-contracting.mjs --project maosglobalops` consulta contagens. Com `--execute`, acrescenta metadados de calendário e contagem apenas às ofertas com horário válido. Não altera condições, não cancela pessoas nem escreve na MaosOps. Recusa execução se detetar conflitos históricos.

Ordem após ativar faturação e confirmar permissões (atualizada em [operacoes.md](../operacoes.md), que inclui as funções `admin`, `engagementMail` e `shiftReminders` e os índices):

```sh
npm ci --prefix functions
npm run test:emulators
npm run build
firebase deploy --only functions:contracting --project maosglobalops
firebase deploy --only firestore:rules --project maosglobalops
node scripts/migrate-contracting.mjs --project maosglobalops --execute
firebase deploy --only hosting --project maosglobalops
```

Confirmar a chamada autenticada e os ficheiros publicados. A ativação de faturação é uma decisão do titular do projeto: não foi executada. Função configurada com zero instâncias mínimas e máximo de três; esse máximo não é um teto de custos. Não reverter apenas as regras para permitir novamente mudanças diretas nas contratações.

## Limites

Os controlos não incluem ainda disputas, pagamentos, penalizações por cancelamento, expiração antecipada de propostas, App Check ou alertas operacionais. A verificação de sobreposições consulta o histórico do trabalhador; adequado ao piloto atual, a otimizar com índices temporais quando o volume justificar. Testes locais usam emuladores e o runtime Node instalado; validar Node 22 no pipeline antes da primeira publicação.

Referências de implementação: [funções callable](https://firebase.google.com/docs/functions/callable), [transações](https://firebase.google.com/docs/firestore/manage-data/transactions), [isolamento e concorrência](https://firebase.google.com/docs/firestore/transaction-data-contention), [requisitos de publicação](https://firebase.google.com/docs/functions/get-started).
