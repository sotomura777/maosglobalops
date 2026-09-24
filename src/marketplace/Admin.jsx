import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../App";
import { adminApi } from "./service";
import { STATUS } from "./model";
import { Empty, ErrorBox, Field, Heading } from "./Layout";

// A claim vem no token de login; a app só a lê, nunca a escreve.
export function useIsAdmin() {
  const { user } = useAuth();
  const [admin, setAdmin] = useState(null);
  useEffect(() => {
    let active = true;
    user
      ?.getIdTokenResult()
      .then((r) => active && setAdmin(r.claims.admin === true))
      .catch(() => active && setAdmin(false));
    return () => {
      active = false;
    };
  }, [user]);
  return admin;
}

const TABS = [
  ["stats", "Estatísticas"],
  ["companies", "Empresas"],
  ["accounts", "Contas"],
];

export function AdminPage() {
  const admin = useIsAdmin();
  const [search, setSearch] = useSearchParams();
  const tab = TABS.some(([id]) => id === search.get("tab"))
    ? search.get("tab")
    : "stats";
  if (admin === null) return <p className="subtle">A verificar acesso…</p>;
  if (!admin)
    return (
      <Empty title="Acesso reservado">
        Esta área é só para a administração da plataforma.
      </Empty>
    );
  return (
    <>
      <Heading eyebrow="Administração" title="Painel da plataforma" />
      <div className="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            className={tab === id ? "active" : ""}
            onClick={() => setSearch({ tab: id })}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "stats" && <Stats />}
      {tab === "companies" && <Companies />}
      {tab === "accounts" && <Accounts />}
    </>
  );
}

function useAdminQuery(operation) {
  const [state, setState] = useState({ data: null, error: "", loading: true });
  const load = () => {
    setState((s) => ({ ...s, loading: true, error: "" }));
    adminApi(operation)
      .then((data) => setState({ data, error: "", loading: false }))
      .catch((e) => setState({ data: null, error: e.message, loading: false }));
  };
  useEffect(load, [operation]);
  return [state, load];
}

function Tile({ label, value, hint }) {
  return (
    <div className="stat">
      <small>{label}</small>
      <strong>{value ?? "—"}</strong>
      {hint && <span>{hint}</span>}
    </div>
  );
}

function Stats() {
  const [{ data, error, loading }, reload] = useAdminQuery("stats");
  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!data) return <p className="subtle">A contar…</p>;
  const r = data.reliability || {};
  return (
    <div className="stack">
      <div className="stats-grid">
        <Tile label="Profissionais" value={data.accounts.workers} />
        <Tile label="Empresas" value={data.accounts.companies} />
        <Tile label="Novas contas" value={data.accounts.lastWeek} hint="últimos 7 dias" />
        <Tile label="Empresas por validar" value={data.companies.pending} />
        <Tile label="Ofertas abertas" value={data.jobs.open} hint={`${data.jobs.closed} ${data.jobs.closed === 1 ? "encerrada" : "encerradas"}`} />
        <Tile label="Denúncias abertas" value={data.reportsOpen} />
      </div>
      <div className="panel">
        <h3 className="section-title">Contratações por estado</h3>
        <div className="detail-grid">
          {Object.entries(data.engagements).map(([status, n]) => (
            <div key={status}>
              <small>{STATUS[status] || status}</small>
              <strong>{n}</strong>
            </div>
          ))}
        </div>
      </div>
      <div className="panel">
        <h3 className="section-title">Fiabilidade</h3>
        <div className="detail-grid">
          <div>
            <small>Faltas</small>
            <strong>{r.noShows ?? 0}</strong>
          </div>
          <div>
            <small>Atrasos</small>
            <strong>{r.late ?? 0}</strong>
          </div>
          <div>
            <small>Cancelamentos</small>
            <strong>{r.cancellationsTotal ?? 0}</strong>
          </div>
          <div>
            <small>Cancelamentos &lt;24h</small>
            <strong>{r.cancellationsLate ?? 0}</strong>
          </div>
        </div>
      </div>
      <div className="actions">
        <button className="btn secondary" disabled={loading} onClick={reload}>
          {loading ? "A atualizar…" : "Atualizar números"}
        </button>
      </div>
    </div>
  );
}

const VERIFICATION = {
  pending: "Por validar",
  verified: "Validada",
  rejected: "Recusada",
};

function Companies() {
  const [{ data, error, loading }, reload] = useAdminQuery("listCompanies");
  const [filter, setFilter] = useState("pending");
  const [notes, setNotes] = useState({});
  const [busy, setBusy] = useState("");
  const [actionError, setActionError] = useState("");
  const decide = async (uid, decision) => {
    setBusy(uid);
    setActionError("");
    try {
      await adminApi("verifyCompany", { uid, decision, note: notes[uid] || "" });
      reload();
    } catch (e) {
      setActionError(e.message);
    } finally {
      setBusy("");
    }
  };
  if (error) return <ErrorBox>{error}</ErrorBox>;
  if (!data) return <p className="subtle">A carregar empresas…</p>;
  const rows = data.filter((c) => filter === "all" || c.verification === filter);
  return (
    <div className="stack">
      <p className="subtle">
        Confirma o NIF, o site ou o contacto antes de validar. Só as empresas
        validadas mostram o selo e podem confirmar trabalhos passados dos
        profissionais.
      </p>
      <div className="tabs">
        {[
          ["pending", "Por validar"],
          ["verified", "Validadas"],
          ["rejected", "Recusadas"],
          ["all", "Todas"],
        ].map(([id, label]) => (
          <button
            key={id}
            className={filter === id ? "active" : ""}
            onClick={() => setFilter(id)}
          >
            {label}
            <span className="tab-count">
              {id === "all" ? data.length : data.filter((c) => c.verification === id).length}
            </span>
          </button>
        ))}
      </div>
      <ErrorBox>{actionError}</ErrorBox>
      {rows.length ? (
        rows.map((c) => (
          <div className="panel" key={c.uid}>
            <div className="row between wrap">
              <div>
                <strong>{c.name || "Sem nome"}</strong>
                <p className="subtle">
                  {c.companyLegalName || "Nome legal não indicado"} · {c.email}
                </p>
                <div className="row wrap">
                  <Link className="quiet" to={`/app/profissionais/${c.uid}`}>
                    Ver perfil público →
                  </Link>
                  {/^https?:\/\//.test(c.website) && (
                    <a className="quiet" href={c.website} target="_blank" rel="noreferrer">
                      {c.website} ↗
                    </a>
                  )}
                </div>
              </div>
              <span className={`tag ${c.verification === "verified" ? "green" : ""}`}>
                {VERIFICATION[c.verification]}
                {c.suspended ? " · suspensa" : ""}
              </span>
            </div>
            <Field label="Nota interna (fica só na administração)">
              <input
                value={notes[c.uid] ?? c.note}
                maxLength={500}
                onChange={(e) => setNotes({ ...notes, [c.uid]: e.target.value })}
                placeholder="Ex.: NIF 500000000 confirmado no portal"
              />
            </Field>
            <div className="actions">
              <button
                className="btn gold"
                disabled={!!busy || loading}
                onClick={() => decide(c.uid, "approve")}
              >
                {busy === c.uid ? "A guardar…" : "Validar empresa"}
              </button>
              <button
                className="btn secondary"
                disabled={!!busy || loading}
                onClick={() => decide(c.uid, "reject")}
              >
                Recusar
              </button>
            </div>
          </div>
        ))
      ) : (
        <Empty title="Nada nesta lista">
          {filter === "pending"
            ? "Não há empresas à espera de validação."
            : "Nenhuma empresa neste estado."}
        </Empty>
      )}
    </div>
  );
}

function Accounts() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState(undefined);
  const [note, setNote] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const run = async (fn) => {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const find = (e) => {
    e.preventDefault();
    setConfirming(false);
    setNote("");
    run(async () => setResult(await adminApi("findUser", { email })));
  };
  const refresh = async () =>
    setResult(await adminApi("findUser", { email: result.email }));
  return (
    <div className="stack">
      <form className="panel stack" onSubmit={find}>
        <Field label="Email da conta">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@exemplo.pt"
          />
        </Field>
        <div className="actions">
          <button className="btn secondary" disabled={busy || !email.trim()}>
            {busy && result === undefined ? "A procurar…" : "Procurar conta"}
          </button>
        </div>
      </form>
      <ErrorBox>{error}</ErrorBox>
      {result === null && (
        <Empty title="Nenhuma conta com este email">
          Confirma se o email está bem escrito.
        </Empty>
      )}
      {result && (
        <div className="panel stack">
          <div className="row between wrap">
            <div>
              <strong>{result.name || "Sem perfil"}</strong>
              <p className="subtle">
                {result.email} ·{" "}
                {result.kind === "company" ? "Empresa" : result.kind === "worker" ? "Profissional" : "—"}
                {result.admin ? " · administração" : ""}
              </p>
              {result.kind && (
                <Link className="quiet" to={`/app/profissionais/${result.uid}`}>
                  Ver perfil público →
                </Link>
              )}
            </div>
            <span className={`tag ${result.suspended ? "" : "green"}`}>
              {result.suspended ? "Suspensa" : "Ativa"}
            </span>
          </div>
          {result.suspended ? (
            <>
              {result.note && <p className="subtle">Motivo: {result.note}</p>}
              <div className="actions">
                <button
                  className="btn secondary"
                  disabled={busy}
                  onClick={() =>
                    run(async () => {
                      await adminApi("unsuspendUser", { uid: result.uid });
                      await refresh();
                    })
                  }
                >
                  Reativar conta
                </button>
              </div>
            </>
          ) : result.admin ? (
            <p className="subtle">Contas de administração não podem ser suspensas aqui.</p>
          ) : (
            <>
              <Field label="Motivo da suspensão (obrigatório, fica registado)">
                <textarea
                  rows="3"
                  maxLength={500}
                  value={note}
                  onChange={(e) => {
                    setNote(e.target.value);
                    setConfirming(false);
                  }}
                />
              </Field>
              <div className="actions">
                {confirming ? (
                  <>
                    <button
                      className="btn gold"
                      disabled={busy}
                      onClick={() =>
                        run(async () => {
                          await adminApi("suspendUser", { uid: result.uid, note });
                          setConfirming(false);
                          await refresh();
                        })
                      }
                    >
                      {busy ? "A suspender…" : "Sim, suspender agora"}
                    </button>
                    <button className="btn secondary" disabled={busy} onClick={() => setConfirming(false)}>
                      Voltar
                    </button>
                  </>
                ) : (
                  <button
                    className="btn secondary"
                    disabled={busy || !note.trim()}
                    onClick={() => setConfirming(true)}
                  >
                    Suspender conta
                  </button>
                )}
              </div>
              {confirming && (
                <p className="subtle">
                  A pessoa deixa de conseguir entrar e sai do diretório. Podes
                  reativar a conta mais tarde.
                </p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
