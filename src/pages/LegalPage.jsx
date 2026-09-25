import { Link } from "react-router-dom";

// RASCUNHO: rever com um jurista antes de lançar (ver docs/operacoes.md).
// Preencher o responsável e o contacto antes de publicar.
const CONTROLLER = "[nome e NIF do responsável pelo tratamento]";
const CONTACT = "[email de contacto para privacidade]";

const PRIVACY = [
  ["Quem trata os teus dados", [`${CONTROLLER}. Para qualquer questão sobre os teus dados: ${CONTACT}.`]],
  [
    "Que dados guardamos",
    [
      "Conta: nome, email, telefone (se o indicares) e a data em que aceitaste esta política.",
      "Perfil: o que escreves sobre ti ou sobre a empresa, funções, distrito, línguas e disponibilidade. O perfil só é visível a outros utilizadores se o tornares público.",
      "Atividade: ofertas, candidaturas, contratações, mensagens, avaliações, presenças, cancelamentos e horas, porque são o registo do trabalho combinado entre as duas partes.",
      "Registo pessoal de horas e ganhos, visível só para ti.",
    ],
  ],
  [
    "Para que usamos",
    [
      "Pôr profissionais e empresas em contacto e registar o trabalho combinado (execução do contrato que aceitas ao usar a plataforma).",
      "Construir o teu currículo verificado e as métricas de fiabilidade que as empresas veem no teu perfil público.",
      "Enviar avisos sobre as tuas contratações por email. Podes desligá-los em Segurança da conta.",
      "Segurança: prevenir fraude, tratar denúncias e cumprir obrigações legais.",
    ],
  ],
  [
    "Com quem partilhamos",
    [
      "Com a empresa ou o profissional com quem combinas um trabalho, só o necessário para esse trabalho.",
      "Se fores aceite por uma empresa que tem app própria (por exemplo a MaosOps), essa empresa recebe o teu nome, email e telefone para te criar uma conta de staff. És avisado antes de te candidatares.",
      "Prestadores que nos ajudam a funcionar: Google (Firebase: alojamento, base de dados e login) e Resend (envio de emails).",
      "Não vendemos dados nem os usamos para publicidade.",
    ],
  ],
  [
    "Durante quanto tempo",
    [
      "Enquanto a conta existir. Ao apagá-la, removemos o perfil, os contactos, o currículo e a reputação. Nas contratações que a outra parte também tem, o teu nome é substituído por 'Conta apagada'.",
      "As cópias de segurança são apagadas automaticamente ao fim de 7 dias.",
    ],
  ],
  [
    "Os teus direitos",
    [
      "Em Segurança da conta podes descarregar todos os teus dados e apagar a tua conta.",
      `Podes também pedir a correção ou a limitação do tratamento, ou opor-te a ele, através de ${CONTACT}.`,
      "Podes apresentar reclamação à Comissão Nacional de Proteção de Dados (www.cnpd.pt).",
    ],
  ],
];

const TERMS = [
  [
    "O que é a GlobalOps",
    [
      "Um mercado onde profissionais independentes e empresas de eventos e restauração se encontram. A GlobalOps não é parte no trabalho combinado nem processa pagamentos: as condições são acordadas diretamente entre a empresa e o profissional.",
    ],
  ],
  [
    "Contas",
    [
      "Tens de dar informação verdadeira e manter o acesso à tua conta seguro. Uma pessoa, uma conta.",
      "As empresas declaram a sua identificação. O selo 'Empresa validada' só aparece depois de verificada pela administração.",
    ],
  ],
  [
    "Regras de utilização",
    [
      "Não é permitido: publicar ofertas falsas, pedir pagamentos para aceder a trabalhos, assediar outras pessoas, ou usar a plataforma para outros fins.",
      "As avaliações devem refletir trabalhos reais. Cancelamentos depois de confirmar e faltas ficam registados na fiabilidade do perfil.",
      "Podemos suspender contas que violem estas regras, depois de analisar denúncias.",
    ],
  ],
  [
    "Responsabilidade",
    [
      "A GlobalOps faz o possível por manter o serviço disponível e seguro, mas não garante a disponibilidade de trabalhos nem o cumprimento das condições acordadas entre as partes.",
    ],
  ],
  ["Contacto", [CONTACT]],
];

export default function LegalPage({ kind }) {
  const privacy = kind === "privacy";
  const sections = privacy ? PRIVACY : TERMS;
  return (
    <main className="panel" style={{ maxWidth: 760, margin: "32px auto", padding: 28 }}>
      <Link to="/" className="quiet">
        ← GlobalOps
      </Link>
      <h1 style={{ margin: "16px 0 8px" }}>
        {privacy ? "Política de privacidade" : "Termos de utilização"}
      </h1>
      <p className="subtle">Última atualização: setembro de 2026.</p>
      {sections.map(([title, paragraphs]) => (
        <section key={title} style={{ marginTop: 28 }}>
          <h2 className="section-title">{title}</h2>
          {paragraphs.map((p) => (
            <p key={p} style={{ lineHeight: 1.65, marginBottom: 10 }}>
              {p}
            </p>
          ))}
        </section>
      ))}
      <p style={{ marginTop: 32 }}>
        {privacy ? (
          <Link to="/termos">Ler os termos de utilização</Link>
        ) : (
          <Link to="/privacidade">Ler a política de privacidade</Link>
        )}
      </p>
    </main>
  );
}
