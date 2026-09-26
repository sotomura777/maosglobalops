# GlobalOps e as apps das empresas

Decidido em 25 set 2026. Este documento regista como a GlobalOps se relaciona com as apps próprias das empresas (MaosOps, Btrust e futuras). Serve de referência antes de mexer em código de qualquer um dos lados.

## Papéis

- **GlobalOps é o mercado de trabalho.** As pessoas encontram trabalhos, candidatam-se, avaliam e são avaliadas, constroem o currículo e veem quanto ganham à hora. Não tem check-in, escalas nem gestão interna, e não vai ter.
- **As apps das empresas são personalizadas de propósito.** Tratam do dia-a-dia com essa empresa: escalas, check-in, turnos, gestão da equipa.
- **Há dois tipos de empresa:**
  - **Básica:** faz tudo na GlobalOps.
  - **Com app própria:** recruta na GlobalOps e opera na sua app.
- **Objetivo:** as empresas querem fidelizar o seu staff; quem não tem empresa fixa usa a GlobalOps para encontrar oportunidades. A mesma pessoa pode trabalhar com várias empresas e estar mais ligada a uma.
- **No futuro, a GlobalOps pode passar a ser tudo.** As decisões abaixo servem para essa mudança não obrigar a reescrever nada.

## Passagem para a app da empresa

1. A pessoa candidata-se na GlobalOps a uma oferta de uma empresa com app própria.
   - O ecrã de candidatura avisa: "Se fores aceite, a [empresa] cria-te uma conta de staff na [app]", e diz que dados são partilhados.
2. **O admin da empresa aceita a candidatura. Essa é a aprovação.** Só nesse momento é criada a conta de staff na app da empresa.
   - É criada uma única vez por pessoa e empresa. As aceitações seguintes reutilizam a mesma conta.
   - A conta é criada automaticamente e ligada à mesma identidade. A pessoa não faz um segundo registo nem cria outra password (objetivo: "Entrar com GlobalOps").
3. O trabalho é executado na app da empresa: escalas, check-in, horas.
4. **O resultado volta à GlobalOps** (concluído, presença, horas) e fica na mesma contratação. A avaliação e o currículo continuam na GlobalOps.

## Onde vive cada dado (uma casa por dado)

| Dado | Casa |
|---|---|
| Perfil, currículo, avaliações, fiabilidade, ganhos/hora | GlobalOps |
| Oferta, candidatura, aceitação, contratação | GlobalOps |
| Escalas, check-in, turnos, gestão interna | App da empresa |
| Resultado do trabalho (concluído, presença, horas) | Nasce na app da empresa e é **devolvido** à contratação da GlobalOps |
| Tudo com uma empresa básica | GlobalOps |

Cada trabalho tem **uma só origem**: não pode entrar no currículo pela contratação e também por uma sincronização solta.

## Regras para as pessoas

- **O currículo é da pessoa.** A empresa não pode esconder nem apagar histórico ou avaliações ganhos com ela.
- **Ter conta numa app de empresa não impede** a pessoa de aceitar trabalhos de outras empresas na GlobalOps. Uma eventual fidelização ("staff preferencial") é um benefício, nunca uma exclusividade imposta pela plataforma.

## RGPD

- Criar a conta na app da empresa é partilhar dados pessoais (nome, email, telefone) com essa empresa.
- A base legal é a execução do trabalho. Exige transparência: dizer na candidatura o que é partilhado, com quem e quando (na aceitação).
- **Por rever por especialista antes de lançar.**

## Se a pessoa recusar depois de aceite

| Situação | Conta na app da empresa |
|---|---|
| Criada nesta aceitação, e a pessoa recusa antes de trabalhar | **Apagada** (RGPD: sem motivo para a empresa guardar os dados). Numa nova aceitação volta a ser criada automaticamente. |
| Já existia por trabalhos anteriores | **Mantém-se**; a pessoa só sai deste trabalho (escalas, etc.). |

Na GlobalOps fica a candidatura com o estado e o motivo. Recusar antes de confirmar não penaliza a fiabilidade.

## Hoje (manual) e depois (automático)

**Hoje, sem tocar nas apps das empresas**, já implementado na GlobalOps:
- **Marcar a empresa:** o admin marca uma empresa validada como "tem app própria" (nome e endereço https) em Administração → Empresas. Fica em `companyStatus/{uid}.app`.
- **Aviso na candidatura:** a candidatura a ofertas dessa empresa mostra o aviso de partilha de dados.
- **Aceitação:** aceitar cria ou atualiza `handovers/{empresa}_{pessoa}`, com nome, email, telefone e as contratações. Só a empresa e a pessoa o leem, e só o servidor o escreve.
- **Estados do pedido:**
  - `to_create` → `created`: a empresa cria a conta na app e confirma em "Staff para a {app}";
  - recusa antes de trabalhar, sem outro trabalho ativo: `created` → `to_delete` → `deleted` (a empresa apaga e confirma), ou `to_create` → `cancelled`;
  - com `worked: true`, depois de um trabalho concluído, nunca passa a `to_delete`;
  - em `deleted` e `cancelled`, o email e o telefone são limpos.
- **Para a pessoa:** vê "As minhas empresas" no início, com o atalho para abrir a app.
- **Resultado do trabalho:** continua a ser confirmado na GlobalOps. A empresa assinala e a pessoa confirma.
- **Ponte:** o `scripts/sync-from-app.mjs` continua só de leitura. Com `--source-key`, lê a app com uma conta de serviço que não consegue escrever nela.

**Limitação até haver ligação automática:** um trabalho feito com a Mãos pela GlobalOps pode aparecer duas vezes no perfil. Uma vez nas contratações da GlobalOps, outra na "Experiência validada" importada da MaosOps, porque a MaosOps ainda não sabe que esse evento veio da GlobalOps.

**Depois (automático)** exige uma alteração pequena em cada app de empresa, feita num branch à parte e revista antes de entrar.

## Contrato para as apps das empresas

1. **Criar ou apagar a conta.** A app lê os `handovers` com o estado `to_create` ou `to_delete` da sua empresa, com uma conta de serviço da GlobalOps limitada a isso ou através de uma função da GlobalOps. Cria ou apaga a conta e confirma pela operação `handover {workerId, done: "created" | "deleted"}`, que já existe e é a mesma que o admin usa à mão.
2. **Identidade.** A conta de staff guarda o `uid` da GlobalOps (`globalopsUid`). O "Entrar com GlobalOps" funciona assim: a app valida o token de login da GlobalOps numa função sua e abre a sessão para o staff com esse `globalopsUid`.
3. **Ligação do trabalho.** Cada evento ou turno criado para alguém que veio da GlobalOps guarda o `globalopsEngagementId`. Sem este campo não é possível devolver resultados nem evitar a contagem a dobrar.
4. **Resultado.** No fim do trabalho, a app envia para a GlobalOps:
   ```
   { engagementId, attendance: "present" | "late" | "no_show", lateMinutes, hours }
   ```
   A chamada é autenticada entre servidores. A GlobalOps aplica-o como se a empresa tivesse assinalado a conclusão, e a pessoa continua a confirmar. Os trabalhos com `globalopsEngagementId` deixam de entrar na importação agregada do `sync-from-app`.

## O que falta do lado das apps (MaosOps, Btrust)

1. Pontos 1 a 4 do contrato.
2. As apps devem partilhar a mesma base de código, com as personalizações como configuração ou módulos, para não haver N apps diferentes para manter.
