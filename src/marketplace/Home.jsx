import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../App";
import { useMarket } from "./context";
import { watchJobs, watchOwnJobs } from "./service";
import { dateLabel, today, needsResponse, statusFor, payLabel } from "./model";
import { Heading, ErrorBox, Icon } from "./Layout";
import { JobCard } from "./Jobs";
import { useJobDetails } from "./useJobs";
export default function Home() {
  const { user, profile } = useAuth();
  const { applications, loading, handovers = [], ownApp } = useMarket();
  const handoverTodo = handovers.filter((h) =>
    ["to_create", "to_delete"].includes(h.status),
  ).length;
  const myCompanies = handovers.filter((h) =>
    ["to_create", "created"].includes(h.status),
  );
  const company = profile.kind === "company";
  const [jobs, setJobs] = useState(null);
  const [error, setError] = useState("");
  const details = useJobDetails(applications);
  useEffect(
    () =>
      company
        ? watchOwnJobs(user.uid, setJobs, () =>
            setError("Não foi possível carregar as ofertas."),
          )
        : watchJobs(setJobs, () =>
            setError("Não foi possível carregar as oportunidades."),
          ),
    [company, user.uid],
  );
  const attention = applications.filter((a) => needsResponse(a, company));
  const next = applications
    .filter((a) => ["confirmed", "completion_requested"].includes(a.status))
    .sort((a, b) =>
      (details[a.jobId]?.date || "9999").localeCompare(
        details[b.jobId]?.date || "9999",
      ),
    )[0];
  const available = (jobs || []).filter(
    (j) =>
      j.status === "open" &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(j.date) || j.date >= today()),
  );
  const local = available.filter(
    (j) => !profile.district || j.district === profile.district,
  );
  const offers = company ? available : local.length ? local : available;
  return (
    <>
      <Heading
        eyebrow={company ? "Área da empresa" : "A tua atividade"}
        title={`Olá, ${(profile.name || "").split(" ")[0]}.`}
        action={
          company ? (
            <Link className="btn gold" to="/app/publicar">
              + Publicar trabalho
            </Link>
          ) : null
        }
      >
        {company
          ? "As tuas ofertas e as respostas que precisam de ti."
          : "O que tens para fazer e as oportunidades a seguir."}
      </Heading>
      <ErrorBox>{error}</ErrorBox>
      {loading ? (
        <p className="subtle" role="status">
          A carregar a tua atividade…
        </p>
      ) : (
        attention.length > 0 && (
          <section className="attention-panel">
            <div className="row between">
              <h2 className="section-title">Precisa da tua resposta</h2>
              <span className="tag gold">{attention.length}</span>
            </div>
            {attention.slice(0, 3).map((a) => (
              <Link
                key={a.id}
                className="action-row"
                to={`/app/contratacoes/${a.id}`}
              >
                <div>
                  <strong>{a.title}</strong>
                  <p>
                    {statusFor(a, company)} ·{" "}
                    {company ? a.workerName : a.companyName}
                  </p>
                </div>
                <Icon name="arrow" />
              </Link>
            ))}
          </section>
        )
      )}
      {company && ownApp && handoverTodo > 0 && (
        <Link className="setup-strip" to="/app/equipa">
          <div>
            <strong>
              {handoverTodo === 1
                ? `1 pessoa para tratar na ${ownApp.name}`
                : `${handoverTodo} pessoas para tratar na ${ownApp.name}`}
            </strong>
            <p className="subtle">Cria ou apaga as contas de staff e confirma aqui.</p>
          </div>
          <Icon name="arrow" />
        </Link>
      )}
      {!company && myCompanies.length > 0 && (
        <section className="panel">
          <h2 className="section-title">As minhas empresas</h2>
          {myCompanies.map((h) => (
            <div className="review row between wrap" key={h.id}>
              <div>
                <strong>{h.companyName}</strong>
                <p>
                  {h.status === "created"
                    ? `Tens conta de staff na ${h.appName}.`
                    : `A ${h.companyName} está a criar a tua conta na ${h.appName}.`}
                </p>
              </div>
              {h.status === "created" && /^https:\/\//.test(h.appUrl) && (
                <a className="btn secondary" href={h.appUrl} target="_blank" rel="noreferrer">
                  Abrir {h.appName} ↗
                </a>
              )}
            </div>
          ))}
        </section>
      )}
      {next && (
        <section className="panel next-job">
          <div className="eyebrow">Próximo trabalho</div>
          <h2 className="section-title">{next.title}</h2>
          <p>
            {dateLabel(details[next.jobId]?.date)}{" "}
            {details[next.jobId]?.startTime &&
              `· ${details[next.jobId].startTime}–${details[next.jobId].endTime}`}
          </p>
          <p className="subtle">
            {details[next.jobId]?.location || details[next.jobId]?.district} ·{" "}
            {payLabel(details[next.jobId] || {})}
          </p>
          <div className="actions">
            <Link className="btn" to={`/app/contratacoes/${next.id}`}>
              Ver detalhes
            </Link>
            <Link
              className="btn secondary"
              to={`/app/contratacoes/${next.id}?view=chat`}
            >
              Abrir conversa
            </Link>
          </div>
        </section>
      )}
      {!company && !profile.public && (
        <div className="setup-strip">
          <div>
            <strong>Apresenta-te às empresas</strong>
            <p className="subtle">Revê o perfil e escolhe quem o pode ver.</p>
          </div>
          <Link className="btn secondary" to="/app/perfil">
            Ver perfil
          </Link>
        </div>
      )}
      <div className="row between wrap">
        <h2 className="section-title">
          {company
            ? "Ofertas abertas"
            : local.length && profile.district
              ? `Oportunidades em ${profile.district}`
              : "Oportunidades para ti"}
        </h2>
        <Link
          className="quiet"
          to={company ? "/app/meus-trabalhos?tab=offers" : "/app/trabalhos"}
        >
          Ver todas →
        </Link>
      </div>
      {!company &&
        profile.district &&
        !local.length &&
        available.length > 0 && (
          <p className="subtle" style={{ marginBottom: 16 }}>
            Ainda sem ofertas em {profile.district}. Estas oportunidades estão
            noutras zonas.
          </p>
        )}
      {jobs === null ? (
        <p role="status" className="subtle">
          A carregar ofertas…
        </p>
      ) : offers.length ? (
        <div className="grid-two">
          {offers.slice(0, 4).map((j) => (
            <JobCard job={j} key={j.id} />
          ))}
        </div>
      ) : (
        <div className="compact-empty">
          <h3>
            {company
              ? "Publica a tua primeira oferta"
              : "Ainda não há ofertas disponíveis"}
          </h3>
          <p className="subtle">
            {company
              ? "Indica o serviço e as condições para começar a receber candidatos."
              : "Podes explorar outras zonas ou preparar o perfil para as próximas oportunidades."}
          </p>
          <Link
            className="btn secondary"
            to={company ? "/app/publicar" : "/app/trabalhos"}
          >
            {company ? "Criar oferta" : "Ver trabalhos noutras zonas"}
          </Link>
        </div>
      )}
      <div className="activity-summary">
        <Link to="/app/meus-trabalhos?tab=waiting">
          {
            applications.filter((a) =>
              ["pending", "accepted"].includes(a.status),
            ).length
          }{" "}
          candidaturas em curso
        </Link>
        <Link to="/app/meus-trabalhos?tab=history">
          {applications.filter((a) => a.status === "completed").length}{" "}
          trabalhos concluídos
        </Link>
        {!company && <Link to="/app/ganhos">Horas e ganhos →</Link>}
      </div>
    </>
  );
}
