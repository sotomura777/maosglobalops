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

## O que muda em cada lado

**GlobalOps**
1. No admin: marcar a empresa como "tem app própria", com a ligação à app. Só para empresas validadas.
2. No ecrã de candidatura: o aviso de partilha para empresas com app própria.
3. Na aceitação (`pending → accepted`, na função `contracting`): pedir à app da empresa a criação da conta de staff.
4. Receber o resultado devolvido pela app da empresa e aplicá-lo à contratação: conclusão, presença, reputação e histórico. Substitui o `scripts/sync-from-app.mjs` para os trabalhos que começaram na GlobalOps.
5. Em "As minhas empresas": um atalho para abrir cada app onde a pessoa tem conta.

**App da empresa (MaosOps, Btrust)**
1. Receber o pedido de criação de conta e criá-la ligada à identidade GlobalOps.
2. "Entrar com GlobalOps": aceitar o login da GlobalOps em vez de uma password própria.
3. Devolver o resultado de cada trabalho à GlobalOps.
4. As apps devem partilhar a mesma base de código, com as personalizações como configuração ou módulos, para não haver N apps diferentes para manter.

## Em aberto

- Se a pessoa recusar o trabalho depois de aceite, a conta na app da empresa fica inativa ou é apagada?
- Mecanismo técnico do "Entrar com GlobalOps" entre projetos Firebase diferentes. Proposta: a app da empresa valida o login da GlobalOps numa função e abre a sessão com a mesma identidade. A decidir depois de ver o código da MaosOps.
- Formato do resultado devolvido e como a GlobalOps confirma que vem mesmo da app da empresa (autenticação entre servidores).
