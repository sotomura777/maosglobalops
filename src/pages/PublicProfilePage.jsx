import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useAuth } from "../App";
import { resolveHandle } from "../marketplace/service";
import { PublicProfile } from "../marketplace/Profiles";
import { Wordmark } from "../brand/Logo";

// Link público de um perfil (/p/nome): abre sem conta e serve de currículo partilhável.
export default function PublicProfilePage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const [uid, setUid] = useState(undefined);
  useEffect(() => {
    resolveHandle(slug)
      .then(setUid)
      .catch(() => setUid(null));
  }, [slug]);
  return (
    <div className="public-job public-profile">
      <header className="public-job-header no-print">
        <Link className="wordmark" to="/" aria-label="MaosGlobalOps, página inicial">
          <Wordmark height={26} textSize={11} />
        </Link>
        <div className="row">
          {uid && (
            <button type="button" className="btn secondary" onClick={() => window.print()}>
              Guardar CV em PDF
            </button>
          )}
          {!user && (
            <Link className="quiet" to="/entrar">
              Entrar
            </Link>
          )}
        </div>
      </header>
      <main className="public-job-main">
        {uid === undefined ? (
          <p className="subtle" role="status">
            A carregar o perfil…
          </p>
        ) : !uid ? (
          <div className="panel">
            <h1 className="section-title">Perfil indisponível</h1>
            <p className="subtle">
              Este link foi desligado ou não existe. <Link to="/">Ver a GlobalOps</Link>
            </p>
          </div>
        ) : (
          <>
            <PublicProfile uid={uid} publicView />
            <p className="print-only subtle">
              Currículo verificado na GlobalOps · {window.location.origin}/p/{slug}
            </p>
            {!user && (
              <div className="panel no-print" style={{ marginTop: 16 }}>
                <strong>Procuras quem trabalhe contigo, ou trabalho em eventos?</strong>
                <p className="subtle" style={{ margin: "8px 0 14px" }}>
                  Na GlobalOps as empresas encontram profissionais com histórico
                  verificado, e os profissionais encontram trabalho.
                </p>
                <div className="actions">
                  <Link className="btn gold" to="/registar">
                    Criar perfil de profissional
                  </Link>
                  <Link className="btn secondary" to="/registar-empresa">
                    Registar empresa
                  </Link>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
