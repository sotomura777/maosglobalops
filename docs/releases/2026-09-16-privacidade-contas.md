# Privacidade e segurança de contas — fase 1

Publicado em https://maosglobalops.web.app em 16/09/2026 (Europe/Lisbon).

- Identidade privada em `profiles`; apresentação com campos permitidos em `publicProfiles`. Email, telefone e consentimentos não são copiados para a apresentação. Mudanças de visibilidade são atómicas.
- Comprovativos importados acessíveis ao titular e, se o perfil for público, a outros utilizadores autenticados. Ranking consulta apenas trabalhadores públicos, com concorrência limitada.
- Nova área `/app/conta`, confirmação de email e atualização do token. Publicação e candidatura exigem email verificado nas regras do servidor. Recuperação em `/recuperar-password` com resposta neutra e ligações Firebase Auth.
- Consentimento explícito para futuras importações. O importador GlobalOps exige email Auth verificado, conta ativa e impede transferir um comprovativo existente entre titulares. Não foi executada sincronização nem alterado qualquer projeto MaosOps.

Validação: 7 testes unitários (modelo/identidade), 14 testes de permissões e migração, 2 percursos Playwright (mercado completo e recuperação de palavra-passe), build e comparação dos ficheiros publicados. Os testes de autenticação usam o emulador; não verificam a entrega real dos emails em caixas de correio.

Migração real: 3 perfis processados, 3 apresentações criadas. Segunda execução em pré-visualização: zero alterações necessárias. Regras publicadas antes da migração; hosting publicado depois. Dados privados e visibilidade anterior preservados.

Limites: validação de email comprova posse do endereço, não identidade legal. Consentimento desativado impede futuras importações, preservando o histórico. Avaliações de contratações continuam visíveis na plataforma. Não foram implementados nesta fase os controlos de lotação, sobreposição de horários, conclusão antecipada e datas no servidor identificados no relatório. O build mantém o aviso já existente de bundle superior a 500 kB.
