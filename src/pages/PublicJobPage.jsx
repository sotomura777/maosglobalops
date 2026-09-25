import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../App";
import { getJob } from "../marketplace/service";
import { JobFacts } from "../marketplace/Jobs";
import { CompanyMark } from "../ui";
import GlobalOpsLogo from "../brand/GlobalOpsLogo";

// Página partilhável de uma oferta: abre sem conta, para quem recebe a ligação.
export default function PublicJobPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [job, setJob] = useState(undefined);
  useEffect(() => {
    getJob(id)
      .then(setJob)
      .catch(() => setJob(null));
  }, [id]);
  const inApp = `/app/trabalhos/${id}`;
  const next = encodeURIComponent(inApp);
  return (
    <div className="public-job">
      <header className="public-job-header">
        <Link className="wordmark" to="/" aria-label="MaosGlobalOps, página inicial">
          <GlobalOpsLogo variant="small" height={18} />
        </Link>
        {!user && (
          <Link className="quiet" to={`/entrar?next=${next}`}>
            Entrar
          </Link>
        )}
      </header>
      <main className="public-job-main">
        {job === undefined ? (
          <p className="subtle" role="status">
            A carregar a oferta…
          </p>
        ) : !job ? (
          <div className="panel">
            <h1 className="section-title">Oferta indisponível</h1>
            <p className="subtle">
              Esta oferta foi removida ou é só por convite.{" "}
              <Link to="/">Ver a GlobalOps</Link>
            </p>
          </div>
        ) : (
          <>
            <div className="eyebrow">{job.category || "Trabalho"}</div>
            <h1 className="public-job-title">{job.title}</h1>
            <div className="panel">
              <div className="row">
                <CompanyMark name={job.companyName} />
                <strong>{job.companyName}</strong>
              </div>
              <JobFacts job={job} />
            </div>
            <div className="panel" style={{ marginTop: 16 }}>
              {job.status !== "open" ? (
                <p className="subtle">
                  Esta oferta já não recebe candidaturas.{" "}
                  <Link to={user ? "/app/trabalhos" : "/registar"}>Ver outras oportunidades</Link>
                </p>
              ) : user ? (
                <Link className="btn gold" to={inApp}>
                  Ver na GlobalOps e candidatar-me
                </Link>
              ) : (
                <>
                  <p className="subtle" style={{ marginBottom: 14 }}>
                    Para te candidatares, cria o teu perfil. É grátis e voltas
                    logo a esta oferta.
                  </p>
                  <div className="actions">
                    <Link className="btn gold" to={`/registar?next=${next}`}>
                      Criar perfil e candidatar-me
                    </Link>
                    <Link className="btn secondary" to={`/entrar?next=${next}`}>
                      Já tenho conta
                    </Link>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
